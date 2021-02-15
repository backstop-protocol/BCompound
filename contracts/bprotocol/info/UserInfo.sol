pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;


contract ComptrollerLike {
    function allMarkets(uint m) public view returns(address);
    function markets(address cTokenAddress) public view returns (bool, uint, bool);
    function oracle() public view returns(address);
    function claimComp(address holder) public;    
    function compAccrued(address holder) public view returns(uint);
    function getCompAddress() public view returns (address);    
}

contract BComptrollerLike {
    function c2b(address ctoken) public view returns(address);
}

contract OracleLike {
    function getUnderlyingPrice(address cToken) external view returns (uint);
}

contract ERC20Like {
    function decimals() public returns(uint);
    function name() public returns(string memory);
    function balanceOf(address user) public view returns(uint);
    function allowance(address owner, address spender) public returns(uint);
}

contract CTokenLike {
    function underlying() public returns(address);
    function exchangeRateCurrent() public returns (uint);
    function borrowRatePerBlock() public returns (uint);
    function supplyRatePerBlock() public returns (uint);
    function borrowBalanceCurrent(address account) public returns (uint);
    function totalSupply() public returns (uint);
}

contract RegistryLike {
    function getAvatar(address user) public view returns(address);
}

contract JarConnectorLike {
    function getUserScore(address user) external view returns (uint);
    function getGlobalScore() external view returns (uint);    
    function getUserScoreProgressPerSec(address user) external view returns (uint);
}



contract UserInfo {
    struct TokenInfo {
        address[] btoken;
        address[] ctoken;
        uint[] ctokenDecimals;
        address[] underlying;
        uint[] underlyingDecimals;
        uint[] ctokenExchangeRate;
        uint[] underlyingPrice;
        uint[] borrowRate;
        uint[] supplyRate;
        bool[] listed;
        uint[] collateralFactor;
        uint[] bTotalSupply;
    }
    
    struct PerUserInfo {
        uint[] ctokenBalance;
        uint[] ctokenBorrowBalance;
        uint[] underlyingWalletBalance;
        uint[] underlyingAllowance;
    }

    struct ScoreInfo {
        uint userScore;
        uint userScoreProgressPerSec;        
        uint totalScore;
    }

    struct ImportInfo {
        address avatar;
        uint[]  ctokenAllowance;
        uint    availableEthBalance; 
    }

    struct CompTokenInfo {
        uint    compBalance;
        address comp;
    }

    struct JarInfo {
        uint[] ctokenBalance;
    }

    struct Info {
        TokenInfo     tokenInfo;
        PerUserInfo   cUser; // data on compound
        PerUserInfo   bUser; // data on B
        ImportInfo    importInfo;
        ScoreInfo     scoreInfo;
        CompTokenInfo compTokenInfo;
        JarInfo       jarInfo;
    }
    
    address constant ETH = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    
    function isCETH(address ctoken) internal returns(bool) {
        string memory name = ERC20Like(ctoken).name();
        if(keccak256(abi.encodePacked(name)) == keccak256(abi.encodePacked("Compound ETH"))) return true;
        if(keccak256(abi.encodePacked(name)) == keccak256(abi.encodePacked("Compound Ether"))) return true;
        
        return false;
    }
    
    function getNumMarkets(address comptroller) public returns(uint) {
        bool succ = true;
        uint i;
        for(i = 0 ; ; i++) {
            (succ,) = comptroller.call.gas(1e6)(abi.encodeWithSignature("allMarkets(uint256)", i));
            
            if(! succ) return i;
        }
        
        return 0;
    }
    
    function getTokenInfo(address comptroller, address bComptroller, uint numMarkets) public returns(TokenInfo memory info) {
        info.btoken = new address[](numMarkets);        
        info.ctoken = new address[](numMarkets);
        for(uint m = 0 ; m < numMarkets ; m++) {
            info.ctoken[m] = ComptrollerLike(comptroller).allMarkets(m);
            info.btoken[m] = BComptrollerLike(bComptroller).c2b(info.ctoken[m]);
        }
        info.ctokenDecimals = new uint[](info.ctoken.length);
        info.underlying = new address[](info.ctoken.length);
        info.underlyingDecimals = new uint[](info.ctoken.length);
        info.ctokenExchangeRate = new uint[](info.ctoken.length);
        info.underlyingPrice = new uint[](info.ctoken.length);
        info.borrowRate = new uint[](info.ctoken.length);
        info.supplyRate = new uint[](info.ctoken.length);
        info.listed = new bool[](info.ctoken.length);
        info.collateralFactor = new uint[](info.ctoken.length);
        info.bTotalSupply = new uint[](info.ctoken.length);

        for(uint i = 0 ; i < info.ctoken.length ; i++) {
            info.ctokenDecimals[i] = ERC20Like(info.ctoken[i]).decimals();
            if(isCETH(info.ctoken[i])) {
                info.underlying[i] = ETH;
                info.underlyingDecimals[i] = 18;
            }
            else {
                info.underlying[i] = CTokenLike(info.ctoken[i]).underlying();
                info.underlyingDecimals[i] = ERC20Like(info.underlying[i]).decimals();
            }
            
            info.ctokenExchangeRate[i] = CTokenLike(info.ctoken[i]).exchangeRateCurrent();
            info.underlyingPrice[i] = OracleLike(ComptrollerLike(comptroller).oracle()).getUnderlyingPrice(info.ctoken[i]);
            info.borrowRate[i] = CTokenLike(info.ctoken[i]).borrowRatePerBlock();
            info.supplyRate[i] = CTokenLike(info.ctoken[i]).supplyRatePerBlock();
            
            (info.listed[i], info.collateralFactor[i], ) = ComptrollerLike(comptroller).markets(info.ctoken[i]);

            info.bTotalSupply[i] = CTokenLike(info.btoken[i]).totalSupply();
        }
        
        return info;
    }
    
    function getPerUserInfo(address user, address[] memory ctoken, address[] memory underlying) public returns(PerUserInfo memory info) {
        info.ctokenBalance = new uint[](ctoken.length);
        info.ctokenBorrowBalance = new uint[](ctoken.length);
        info.underlyingWalletBalance = new uint[](ctoken.length);
        info.underlyingAllowance = new uint[](ctoken.length);

        
        for(uint i = 0 ; i < ctoken.length ; i++) {
            info.ctokenBalance[i] = ERC20Like(ctoken[i]).balanceOf(user);
            info.ctokenBorrowBalance[i] = CTokenLike(ctoken[i]).borrowBalanceCurrent(user);
            if(underlying[i] == ETH) {
                info.underlyingWalletBalance[i] = user.balance;
                info.underlyingAllowance[i] = uint(-1);
            }
            else {
                info.underlyingWalletBalance[i] = ERC20Like(underlying[i]).balanceOf(user);
                info.underlyingAllowance[i] = ERC20Like(underlying[i]).allowance(user, ctoken[i]);
            }
        }
    }

    function getImportInfo(address user, address[] memory ctoken, address registry, address sugarDaddy) public returns(ImportInfo memory info) {
        info.avatar = RegistryLike(registry).getAvatar(user);
        info.ctokenAllowance = new uint[](ctoken.length);
        for(uint i = 0 ; i < ctoken.length ; i++) {
            info.ctokenAllowance[i] = ERC20Like(ctoken[i]).allowance(user, info.avatar);
        }
        info.availableEthBalance = sugarDaddy.balance;
    }

    function getScoreInfo(address user, address jarConnector) public view returns(ScoreInfo memory info) {
        info.userScore = JarConnectorLike(jarConnector).getUserScore(user);
        info.userScoreProgressPerSec = JarConnectorLike(jarConnector).getUserScoreProgressPerSec(user);
        info.totalScore = JarConnectorLike(jarConnector).getGlobalScore();
    }


    function getCompTokenInfo(address user, address comptroller, address registry) public returns(CompTokenInfo memory info) {
        address avatar = RegistryLike(registry).getAvatar(user);
        address comp = ComptrollerLike(comptroller).getCompAddress();
        ComptrollerLike(comptroller).claimComp(avatar);
        uint heldComp = ComptrollerLike(comptroller).compAccrued(avatar);

        info.compBalance = ERC20Like(comp).balanceOf(avatar) + heldComp;
        info.comp = comp;
    }

    function getJarInfo(address jar, address[] memory ctoken) public view returns(JarInfo memory info) {
        info.ctokenBalance = new uint[](ctoken.length);
        for(uint i = 0 ; i < ctoken.length ; i++) {
            info.ctokenBalance[i] = ERC20Like(ctoken[i]).balanceOf(jar); 
        }
    }

    function getUserInfo(address user,
                         address comptroller,
                         address bComptroller,
                         address registry,
                         address sugarDaddy,
                         address jarConnector,
                         address jar) public returns(Info memory info) {
        uint numTokens = getNumMarkets(comptroller);
        info.tokenInfo = getTokenInfo(comptroller, bComptroller, numTokens);
        info.bUser = getPerUserInfo(user, info.tokenInfo.btoken, info.tokenInfo.underlying);
        info.cUser = getPerUserInfo(user, info.tokenInfo.ctoken, info.tokenInfo.underlying);
        info.importInfo = getImportInfo(user, info.tokenInfo.ctoken, registry, sugarDaddy);
        info.scoreInfo = getScoreInfo(user, jarConnector);
        info.compTokenInfo = getCompTokenInfo(user, comptroller, registry);
        info.jarInfo = getJarInfo(jar, info.tokenInfo.ctoken);
    }
}
