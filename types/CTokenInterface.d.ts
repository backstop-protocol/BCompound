/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import BN from "bn.js";
import { EventData, PastEventOptions } from "web3-eth-contract";

export interface CTokenInterfaceContract
  extends Truffle.Contract<CTokenInterfaceInstance> {
  "new"(meta?: Truffle.TransactionDetails): Promise<CTokenInterfaceInstance>;
}

export interface AccrueInterest {
  name: "AccrueInterest";
  args: {
    cashPrior: BN;
    interestAccumulated: BN;
    borrowIndex: BN;
    totalBorrows: BN;
    0: BN;
    1: BN;
    2: BN;
    3: BN;
  };
}

export interface Approval {
  name: "Approval";
  args: {
    owner: string;
    spender: string;
    amount: BN;
    0: string;
    1: string;
    2: BN;
  };
}

export interface Borrow {
  name: "Borrow";
  args: {
    borrower: string;
    borrowAmount: BN;
    accountBorrows: BN;
    totalBorrows: BN;
    0: string;
    1: BN;
    2: BN;
    3: BN;
  };
}

export interface Failure {
  name: "Failure";
  args: {
    error: BN;
    info: BN;
    detail: BN;
    0: BN;
    1: BN;
    2: BN;
  };
}

export interface LiquidateBorrow {
  name: "LiquidateBorrow";
  args: {
    liquidator: string;
    borrower: string;
    repayAmount: BN;
    cTokenCollateral: string;
    seizeTokens: BN;
    0: string;
    1: string;
    2: BN;
    3: string;
    4: BN;
  };
}

export interface Mint {
  name: "Mint";
  args: {
    minter: string;
    mintAmount: BN;
    mintTokens: BN;
    0: string;
    1: BN;
    2: BN;
  };
}

export interface NewAdmin {
  name: "NewAdmin";
  args: {
    oldAdmin: string;
    newAdmin: string;
    0: string;
    1: string;
  };
}

export interface NewComptroller {
  name: "NewComptroller";
  args: {
    oldComptroller: string;
    newComptroller: string;
    0: string;
    1: string;
  };
}

export interface NewMarketInterestRateModel {
  name: "NewMarketInterestRateModel";
  args: {
    oldInterestRateModel: string;
    newInterestRateModel: string;
    0: string;
    1: string;
  };
}

export interface NewPendingAdmin {
  name: "NewPendingAdmin";
  args: {
    oldPendingAdmin: string;
    newPendingAdmin: string;
    0: string;
    1: string;
  };
}

export interface NewReserveFactor {
  name: "NewReserveFactor";
  args: {
    oldReserveFactorMantissa: BN;
    newReserveFactorMantissa: BN;
    0: BN;
    1: BN;
  };
}

export interface Redeem {
  name: "Redeem";
  args: {
    redeemer: string;
    redeemAmount: BN;
    redeemTokens: BN;
    0: string;
    1: BN;
    2: BN;
  };
}

export interface RepayBorrow {
  name: "RepayBorrow";
  args: {
    payer: string;
    borrower: string;
    repayAmount: BN;
    accountBorrows: BN;
    totalBorrows: BN;
    0: string;
    1: string;
    2: BN;
    3: BN;
    4: BN;
  };
}

export interface ReservesAdded {
  name: "ReservesAdded";
  args: {
    benefactor: string;
    addAmount: BN;
    newTotalReserves: BN;
    0: string;
    1: BN;
    2: BN;
  };
}

export interface ReservesReduced {
  name: "ReservesReduced";
  args: {
    admin: string;
    reduceAmount: BN;
    newTotalReserves: BN;
    0: string;
    1: BN;
    2: BN;
  };
}

export interface Transfer {
  name: "Transfer";
  args: {
    from: string;
    to: string;
    amount: BN;
    0: string;
    1: string;
    2: BN;
  };
}

type AllEvents =
  | AccrueInterest
  | Approval
  | Borrow
  | Failure
  | LiquidateBorrow
  | Mint
  | NewAdmin
  | NewComptroller
  | NewMarketInterestRateModel
  | NewPendingAdmin
  | NewReserveFactor
  | Redeem
  | RepayBorrow
  | ReservesAdded
  | ReservesReduced
  | Transfer;

export interface CTokenInterfaceInstance extends Truffle.ContractInstance {
  _acceptAdmin: {
    (txDetails?: Truffle.TransactionDetails): Promise<
      Truffle.TransactionResponse<AllEvents>
    >;
    call(txDetails?: Truffle.TransactionDetails): Promise<BN>;
    sendTransaction(txDetails?: Truffle.TransactionDetails): Promise<string>;
    estimateGas(txDetails?: Truffle.TransactionDetails): Promise<number>;
  };

  _reduceReserves: {
    (
      reduceAmount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      reduceAmount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;
    sendTransaction(
      reduceAmount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      reduceAmount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  _setComptroller: {
    (newComptroller: string, txDetails?: Truffle.TransactionDetails): Promise<
      Truffle.TransactionResponse<AllEvents>
    >;
    call(
      newComptroller: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;
    sendTransaction(
      newComptroller: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      newComptroller: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  _setInterestRateModel: {
    (
      newInterestRateModel: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      newInterestRateModel: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;
    sendTransaction(
      newInterestRateModel: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      newInterestRateModel: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  _setPendingAdmin: {
    (newPendingAdmin: string, txDetails?: Truffle.TransactionDetails): Promise<
      Truffle.TransactionResponse<AllEvents>
    >;
    call(
      newPendingAdmin: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;
    sendTransaction(
      newPendingAdmin: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      newPendingAdmin: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  _setReserveFactor: {
    (
      newReserveFactorMantissa: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      newReserveFactorMantissa: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;
    sendTransaction(
      newReserveFactorMantissa: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      newReserveFactorMantissa: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  accrualBlockNumber(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  accrueInterest: {
    (txDetails?: Truffle.TransactionDetails): Promise<
      Truffle.TransactionResponse<AllEvents>
    >;
    call(txDetails?: Truffle.TransactionDetails): Promise<BN>;
    sendTransaction(txDetails?: Truffle.TransactionDetails): Promise<string>;
    estimateGas(txDetails?: Truffle.TransactionDetails): Promise<number>;
  };

  admin(txDetails?: Truffle.TransactionDetails): Promise<string>;

  allowance(
    owner: string,
    spender: string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<BN>;

  approve: {
    (
      spender: string,
      amount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      spender: string,
      amount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<boolean>;
    sendTransaction(
      spender: string,
      amount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      spender: string,
      amount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  balanceOf(owner: string, txDetails?: Truffle.TransactionDetails): Promise<BN>;

  balanceOfUnderlying: {
    (owner: string, txDetails?: Truffle.TransactionDetails): Promise<
      Truffle.TransactionResponse<AllEvents>
    >;
    call(owner: string, txDetails?: Truffle.TransactionDetails): Promise<BN>;
    sendTransaction(
      owner: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      owner: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  borrowBalanceCurrent: {
    (account: string, txDetails?: Truffle.TransactionDetails): Promise<
      Truffle.TransactionResponse<AllEvents>
    >;
    call(account: string, txDetails?: Truffle.TransactionDetails): Promise<BN>;
    sendTransaction(
      account: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      account: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  borrowBalanceStored(
    account: string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<BN>;

  borrowIndex(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  borrowRatePerBlock(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  comptroller(txDetails?: Truffle.TransactionDetails): Promise<string>;

  decimals(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  exchangeRateCurrent: {
    (txDetails?: Truffle.TransactionDetails): Promise<
      Truffle.TransactionResponse<AllEvents>
    >;
    call(txDetails?: Truffle.TransactionDetails): Promise<BN>;
    sendTransaction(txDetails?: Truffle.TransactionDetails): Promise<string>;
    estimateGas(txDetails?: Truffle.TransactionDetails): Promise<number>;
  };

  exchangeRateStored(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  getAccountSnapshot(
    account: string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<[BN, BN, BN, BN]>;

  getCash(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  interestRateModel(txDetails?: Truffle.TransactionDetails): Promise<string>;

  isCToken(txDetails?: Truffle.TransactionDetails): Promise<boolean>;

  name(txDetails?: Truffle.TransactionDetails): Promise<string>;

  pendingAdmin(txDetails?: Truffle.TransactionDetails): Promise<string>;

  reserveFactorMantissa(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  seize: {
    (
      liquidator: string,
      borrower: string,
      seizeTokens: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      liquidator: string,
      borrower: string,
      seizeTokens: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;
    sendTransaction(
      liquidator: string,
      borrower: string,
      seizeTokens: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      liquidator: string,
      borrower: string,
      seizeTokens: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  supplyRatePerBlock(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  symbol(txDetails?: Truffle.TransactionDetails): Promise<string>;

  totalBorrows(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  totalBorrowsCurrent: {
    (txDetails?: Truffle.TransactionDetails): Promise<
      Truffle.TransactionResponse<AllEvents>
    >;
    call(txDetails?: Truffle.TransactionDetails): Promise<BN>;
    sendTransaction(txDetails?: Truffle.TransactionDetails): Promise<string>;
    estimateGas(txDetails?: Truffle.TransactionDetails): Promise<number>;
  };

  totalReserves(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  totalSupply(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  transfer: {
    (
      dst: string,
      amount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      dst: string,
      amount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<boolean>;
    sendTransaction(
      dst: string,
      amount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      dst: string,
      amount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  transferFrom: {
    (
      src: string,
      dst: string,
      amount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      src: string,
      dst: string,
      amount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<boolean>;
    sendTransaction(
      src: string,
      dst: string,
      amount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      src: string,
      dst: string,
      amount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  underlying(txDetails?: Truffle.TransactionDetails): Promise<string>;

  methods: {
    _acceptAdmin: {
      (txDetails?: Truffle.TransactionDetails): Promise<
        Truffle.TransactionResponse<AllEvents>
      >;
      call(txDetails?: Truffle.TransactionDetails): Promise<BN>;
      sendTransaction(txDetails?: Truffle.TransactionDetails): Promise<string>;
      estimateGas(txDetails?: Truffle.TransactionDetails): Promise<number>;
    };

    _reduceReserves: {
      (
        reduceAmount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        reduceAmount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<BN>;
      sendTransaction(
        reduceAmount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        reduceAmount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    _setComptroller: {
      (newComptroller: string, txDetails?: Truffle.TransactionDetails): Promise<
        Truffle.TransactionResponse<AllEvents>
      >;
      call(
        newComptroller: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<BN>;
      sendTransaction(
        newComptroller: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        newComptroller: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    _setInterestRateModel: {
      (
        newInterestRateModel: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        newInterestRateModel: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<BN>;
      sendTransaction(
        newInterestRateModel: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        newInterestRateModel: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    _setPendingAdmin: {
      (
        newPendingAdmin: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        newPendingAdmin: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<BN>;
      sendTransaction(
        newPendingAdmin: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        newPendingAdmin: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    _setReserveFactor: {
      (
        newReserveFactorMantissa: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        newReserveFactorMantissa: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<BN>;
      sendTransaction(
        newReserveFactorMantissa: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        newReserveFactorMantissa: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    accrualBlockNumber(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    accrueInterest: {
      (txDetails?: Truffle.TransactionDetails): Promise<
        Truffle.TransactionResponse<AllEvents>
      >;
      call(txDetails?: Truffle.TransactionDetails): Promise<BN>;
      sendTransaction(txDetails?: Truffle.TransactionDetails): Promise<string>;
      estimateGas(txDetails?: Truffle.TransactionDetails): Promise<number>;
    };

    admin(txDetails?: Truffle.TransactionDetails): Promise<string>;

    allowance(
      owner: string,
      spender: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;

    approve: {
      (
        spender: string,
        amount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        spender: string,
        amount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<boolean>;
      sendTransaction(
        spender: string,
        amount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        spender: string,
        amount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    balanceOf(
      owner: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;

    balanceOfUnderlying: {
      (owner: string, txDetails?: Truffle.TransactionDetails): Promise<
        Truffle.TransactionResponse<AllEvents>
      >;
      call(owner: string, txDetails?: Truffle.TransactionDetails): Promise<BN>;
      sendTransaction(
        owner: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        owner: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    borrowBalanceCurrent: {
      (account: string, txDetails?: Truffle.TransactionDetails): Promise<
        Truffle.TransactionResponse<AllEvents>
      >;
      call(
        account: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<BN>;
      sendTransaction(
        account: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        account: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    borrowBalanceStored(
      account: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;

    borrowIndex(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    borrowRatePerBlock(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    comptroller(txDetails?: Truffle.TransactionDetails): Promise<string>;

    decimals(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    exchangeRateCurrent: {
      (txDetails?: Truffle.TransactionDetails): Promise<
        Truffle.TransactionResponse<AllEvents>
      >;
      call(txDetails?: Truffle.TransactionDetails): Promise<BN>;
      sendTransaction(txDetails?: Truffle.TransactionDetails): Promise<string>;
      estimateGas(txDetails?: Truffle.TransactionDetails): Promise<number>;
    };

    exchangeRateStored(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    getAccountSnapshot(
      account: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<[BN, BN, BN, BN]>;

    getCash(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    interestRateModel(txDetails?: Truffle.TransactionDetails): Promise<string>;

    isCToken(txDetails?: Truffle.TransactionDetails): Promise<boolean>;

    name(txDetails?: Truffle.TransactionDetails): Promise<string>;

    pendingAdmin(txDetails?: Truffle.TransactionDetails): Promise<string>;

    reserveFactorMantissa(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    seize: {
      (
        liquidator: string,
        borrower: string,
        seizeTokens: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        liquidator: string,
        borrower: string,
        seizeTokens: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<BN>;
      sendTransaction(
        liquidator: string,
        borrower: string,
        seizeTokens: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        liquidator: string,
        borrower: string,
        seizeTokens: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    supplyRatePerBlock(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    symbol(txDetails?: Truffle.TransactionDetails): Promise<string>;

    totalBorrows(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    totalBorrowsCurrent: {
      (txDetails?: Truffle.TransactionDetails): Promise<
        Truffle.TransactionResponse<AllEvents>
      >;
      call(txDetails?: Truffle.TransactionDetails): Promise<BN>;
      sendTransaction(txDetails?: Truffle.TransactionDetails): Promise<string>;
      estimateGas(txDetails?: Truffle.TransactionDetails): Promise<number>;
    };

    totalReserves(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    totalSupply(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    transfer: {
      (
        dst: string,
        amount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        dst: string,
        amount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<boolean>;
      sendTransaction(
        dst: string,
        amount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        dst: string,
        amount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    transferFrom: {
      (
        src: string,
        dst: string,
        amount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        src: string,
        dst: string,
        amount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<boolean>;
      sendTransaction(
        src: string,
        dst: string,
        amount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        src: string,
        dst: string,
        amount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    underlying(txDetails?: Truffle.TransactionDetails): Promise<string>;
  };

  getPastEvents(event: string): Promise<EventData[]>;
  getPastEvents(
    event: string,
    options: PastEventOptions,
    callback: (error: Error, event: EventData) => void
  ): Promise<EventData[]>;
  getPastEvents(event: string, options: PastEventOptions): Promise<EventData[]>;
  getPastEvents(
    event: string,
    callback: (error: Error, event: EventData) => void
  ): Promise<EventData[]>;
}