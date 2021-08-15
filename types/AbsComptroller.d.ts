/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import BN from "bn.js";
import { EventData, PastEventOptions } from "web3-eth-contract";

export interface AbsComptrollerContract
  extends Truffle.Contract<AbsComptrollerInstance> {
  "new"(meta?: Truffle.TransactionDetails): Promise<AbsComptrollerInstance>;
}

type AllEvents = never;

export interface AbsComptrollerInstance extends Truffle.ContractInstance {
  calcAmountToLiquidate: {
    (
      debtCToken: string,
      underlyingAmtToLiquidate: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      debtCToken: string,
      underlyingAmtToLiquidate: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<[BN, BN]>;
    sendTransaction(
      debtCToken: string,
      underlyingAmtToLiquidate: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      debtCToken: string,
      underlyingAmtToLiquidate: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  canLiquidate: {
    (txDetails?: Truffle.TransactionDetails): Promise<
      Truffle.TransactionResponse<AllEvents>
    >;
    call(txDetails?: Truffle.TransactionDetails): Promise<boolean>;
    sendTransaction(txDetails?: Truffle.TransactionDetails): Promise<string>;
    estimateGas(txDetails?: Truffle.TransactionDetails): Promise<number>;
  };

  canUntop: {
    (txDetails?: Truffle.TransactionDetails): Promise<
      Truffle.TransactionResponse<AllEvents>
    >;
    call(txDetails?: Truffle.TransactionDetails): Promise<boolean>;
    sendTransaction(txDetails?: Truffle.TransactionDetails): Promise<string>;
    estimateGas(txDetails?: Truffle.TransactionDetails): Promise<number>;
  };

  enterMarket: {
    (bToken: string, txDetails?: Truffle.TransactionDetails): Promise<
      Truffle.TransactionResponse<AllEvents>
    >;
    call(bToken: string, txDetails?: Truffle.TransactionDetails): Promise<BN>;
    sendTransaction(
      bToken: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      bToken: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  enterMarkets: {
    (bTokens: string[], txDetails?: Truffle.TransactionDetails): Promise<
      Truffle.TransactionResponse<AllEvents>
    >;
    call(
      bTokens: string[],
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN[]>;
    sendTransaction(
      bTokens: string[],
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      bTokens: string[],
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  exitMarket: {
    (bToken: string, txDetails?: Truffle.TransactionDetails): Promise<
      Truffle.TransactionResponse<AllEvents>
    >;
    call(bToken: string, txDetails?: Truffle.TransactionDetails): Promise<BN>;
    sendTransaction(
      bToken: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      bToken: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  getMaxLiquidationAmount: {
    (debtCToken: string, txDetails?: Truffle.TransactionDetails): Promise<
      Truffle.TransactionResponse<AllEvents>
    >;
    call(
      debtCToken: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;
    sendTransaction(
      debtCToken: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      debtCToken: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  isPartiallyLiquidated(
    txDetails?: Truffle.TransactionDetails
  ): Promise<boolean>;

  isToppedUp(txDetails?: Truffle.TransactionDetails): Promise<boolean>;

  liquidationCToken(txDetails?: Truffle.TransactionDetails): Promise<string>;

  pool(txDetails?: Truffle.TransactionDetails): Promise<string>;

  quit(txDetails?: Truffle.TransactionDetails): Promise<boolean>;

  quitB: {
    (txDetails?: Truffle.TransactionDetails): Promise<
      Truffle.TransactionResponse<AllEvents>
    >;
    call(txDetails?: Truffle.TransactionDetails): Promise<void>;
    sendTransaction(txDetails?: Truffle.TransactionDetails): Promise<string>;
    estimateGas(txDetails?: Truffle.TransactionDetails): Promise<number>;
  };

  registry(txDetails?: Truffle.TransactionDetails): Promise<string>;

  remainingLiquidationAmount(
    txDetails?: Truffle.TransactionDetails
  ): Promise<BN>;

  splitAmountToLiquidate(
    underlyingAmtToLiquidate: number | BN | string,
    maxLiquidationAmount: number | BN | string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<[BN, BN]>;

  toppedUpAmount(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  toppedUpCToken(txDetails?: Truffle.TransactionDetails): Promise<string>;

  transferCOMP: {
    (txDetails?: Truffle.TransactionDetails): Promise<
      Truffle.TransactionResponse<AllEvents>
    >;
    call(txDetails?: Truffle.TransactionDetails): Promise<void>;
    sendTransaction(txDetails?: Truffle.TransactionDetails): Promise<string>;
    estimateGas(txDetails?: Truffle.TransactionDetails): Promise<number>;
  };

  untop: {
    (
      amount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      amount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<void>;
    sendTransaction(
      amount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      amount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  methods: {
    calcAmountToLiquidate: {
      (
        debtCToken: string,
        underlyingAmtToLiquidate: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        debtCToken: string,
        underlyingAmtToLiquidate: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<[BN, BN]>;
      sendTransaction(
        debtCToken: string,
        underlyingAmtToLiquidate: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        debtCToken: string,
        underlyingAmtToLiquidate: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    canLiquidate: {
      (txDetails?: Truffle.TransactionDetails): Promise<
        Truffle.TransactionResponse<AllEvents>
      >;
      call(txDetails?: Truffle.TransactionDetails): Promise<boolean>;
      sendTransaction(txDetails?: Truffle.TransactionDetails): Promise<string>;
      estimateGas(txDetails?: Truffle.TransactionDetails): Promise<number>;
    };

    canUntop: {
      (txDetails?: Truffle.TransactionDetails): Promise<
        Truffle.TransactionResponse<AllEvents>
      >;
      call(txDetails?: Truffle.TransactionDetails): Promise<boolean>;
      sendTransaction(txDetails?: Truffle.TransactionDetails): Promise<string>;
      estimateGas(txDetails?: Truffle.TransactionDetails): Promise<number>;
    };

    enterMarket: {
      (bToken: string, txDetails?: Truffle.TransactionDetails): Promise<
        Truffle.TransactionResponse<AllEvents>
      >;
      call(bToken: string, txDetails?: Truffle.TransactionDetails): Promise<BN>;
      sendTransaction(
        bToken: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        bToken: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    enterMarkets: {
      (bTokens: string[], txDetails?: Truffle.TransactionDetails): Promise<
        Truffle.TransactionResponse<AllEvents>
      >;
      call(
        bTokens: string[],
        txDetails?: Truffle.TransactionDetails
      ): Promise<BN[]>;
      sendTransaction(
        bTokens: string[],
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        bTokens: string[],
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    exitMarket: {
      (bToken: string, txDetails?: Truffle.TransactionDetails): Promise<
        Truffle.TransactionResponse<AllEvents>
      >;
      call(bToken: string, txDetails?: Truffle.TransactionDetails): Promise<BN>;
      sendTransaction(
        bToken: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        bToken: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    getMaxLiquidationAmount: {
      (debtCToken: string, txDetails?: Truffle.TransactionDetails): Promise<
        Truffle.TransactionResponse<AllEvents>
      >;
      call(
        debtCToken: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<BN>;
      sendTransaction(
        debtCToken: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        debtCToken: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    isPartiallyLiquidated(
      txDetails?: Truffle.TransactionDetails
    ): Promise<boolean>;

    isToppedUp(txDetails?: Truffle.TransactionDetails): Promise<boolean>;

    liquidationCToken(txDetails?: Truffle.TransactionDetails): Promise<string>;

    pool(txDetails?: Truffle.TransactionDetails): Promise<string>;

    quit(txDetails?: Truffle.TransactionDetails): Promise<boolean>;

    quitB: {
      (txDetails?: Truffle.TransactionDetails): Promise<
        Truffle.TransactionResponse<AllEvents>
      >;
      call(txDetails?: Truffle.TransactionDetails): Promise<void>;
      sendTransaction(txDetails?: Truffle.TransactionDetails): Promise<string>;
      estimateGas(txDetails?: Truffle.TransactionDetails): Promise<number>;
    };

    registry(txDetails?: Truffle.TransactionDetails): Promise<string>;

    remainingLiquidationAmount(
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;

    splitAmountToLiquidate(
      underlyingAmtToLiquidate: number | BN | string,
      maxLiquidationAmount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<[BN, BN]>;

    toppedUpAmount(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    toppedUpCToken(txDetails?: Truffle.TransactionDetails): Promise<string>;

    transferCOMP: {
      (txDetails?: Truffle.TransactionDetails): Promise<
        Truffle.TransactionResponse<AllEvents>
      >;
      call(txDetails?: Truffle.TransactionDetails): Promise<void>;
      sendTransaction(txDetails?: Truffle.TransactionDetails): Promise<string>;
      estimateGas(txDetails?: Truffle.TransactionDetails): Promise<number>;
    };

    untop: {
      (
        amount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        amount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<void>;
      sendTransaction(
        amount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        amount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    "claimComp()": {
      (txDetails?: Truffle.TransactionDetails): Promise<
        Truffle.TransactionResponse<AllEvents>
      >;
      call(txDetails?: Truffle.TransactionDetails): Promise<void>;
      sendTransaction(txDetails?: Truffle.TransactionDetails): Promise<string>;
      estimateGas(txDetails?: Truffle.TransactionDetails): Promise<number>;
    };

    "claimComp(address[],bool,bool)": {
      (
        bTokens: string[],
        borrowers: boolean,
        suppliers: boolean,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        bTokens: string[],
        borrowers: boolean,
        suppliers: boolean,
        txDetails?: Truffle.TransactionDetails
      ): Promise<void>;
      sendTransaction(
        bTokens: string[],
        borrowers: boolean,
        suppliers: boolean,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        bTokens: string[],
        borrowers: boolean,
        suppliers: boolean,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    "claimComp(address[])": {
      (bTokens: string[], txDetails?: Truffle.TransactionDetails): Promise<
        Truffle.TransactionResponse<AllEvents>
      >;
      call(
        bTokens: string[],
        txDetails?: Truffle.TransactionDetails
      ): Promise<void>;
      sendTransaction(
        bTokens: string[],
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        bTokens: string[],
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    "getAccountLiquidity()"(
      txDetails?: Truffle.TransactionDetails
    ): Promise<[BN, BN, BN]>;

    "getAccountLiquidity(address)"(
      oracle: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<[BN, BN, BN]>;

    "topup(address,uint256)": {
      (
        cToken: string,
        topupAmount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        cToken: string,
        topupAmount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<void>;
      sendTransaction(
        cToken: string,
        topupAmount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        cToken: string,
        topupAmount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    "topup()": {
      (txDetails?: Truffle.TransactionDetails): Promise<
        Truffle.TransactionResponse<AllEvents>
      >;
      call(txDetails?: Truffle.TransactionDetails): Promise<void>;
      sendTransaction(txDetails?: Truffle.TransactionDetails): Promise<string>;
      estimateGas(txDetails?: Truffle.TransactionDetails): Promise<number>;
    };
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
