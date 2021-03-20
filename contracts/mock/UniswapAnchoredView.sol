pragma experimental ABIEncoderV2;
pragma solidity ^0.5.16;

contract UniswapAnchoredView {
    bytes32 public lastMsgData;

    function postPrices(bytes[] calldata messages, bytes[] calldata signatures, string[] calldata symbols) external returns(bytes32) {
        lastMsgData = keccak256(msg.data);
        return lastMsgData;
    }
}
