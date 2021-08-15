/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import BN from "bn.js";
import { EventData, PastEventOptions } from "web3-eth-contract";

export interface BScoreContract extends Truffle.Contract<BScoreInstance> {
  "new"(
    _registry: string,
    _startDate: number | BN | string,
    _endDate: number | BN | string,
    cTokens: string[],
    sMultipliers: (number | BN | string)[],
    bMultipliers: (number | BN | string)[],
    meta?: Truffle.TransactionDetails
  ): Promise<BScoreInstance>;
}

export interface OwnershipTransferred {
  name: "OwnershipTransferred";
  args: {
    previousOwner: string;
    newOwner: string;
    0: string;
    1: string;
  };
}

type AllEvents = OwnershipTransferred;

export interface BScoreInstance extends Truffle.ContractInstance {
  GLOBAL_USER(txDetails?: Truffle.TransactionDetails): Promise<string>;

  borrowMultiplier(
    arg0: string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<BN>;

  checkpoints(
    arg0: string,
    arg1: string,
    arg2: number | BN | string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<[BN, BN, BN]>;

  collAsset(
    cToken: string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<string>;

  comptroller(txDetails?: Truffle.TransactionDetails): Promise<string>;

  debtAsset(
    cToken: string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<string>;

  endDate(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  getCollGlobalScore(
    cToken: string,
    time: number | BN | string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<BN>;

  getCollScore(
    _user: string,
    cToken: string,
    time: number | BN | string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<BN>;

  getCurrentBalance(
    user: string,
    asset: string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<BN>;

  getDebtGlobalScore(
    cToken: string,
    time: number | BN | string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<BN>;

  getDebtScore(
    _user: string,
    cToken: string,
    time: number | BN | string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<BN>;

  getScore(
    user: string,
    asset: string,
    time: number | BN | string,
    spinStart: number | BN | string,
    checkPointHint: number | BN | string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<BN>;

  initialSnapshot(
    arg0: string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<[BN, BN, BN]>;

  isOwner(txDetails?: Truffle.TransactionDetails): Promise<boolean>;

  owner(txDetails?: Truffle.TransactionDetails): Promise<string>;

  registry(txDetails?: Truffle.TransactionDetails): Promise<string>;

  renounceOwnership: {
    (txDetails?: Truffle.TransactionDetails): Promise<
      Truffle.TransactionResponse<AllEvents>
    >;
    call(txDetails?: Truffle.TransactionDetails): Promise<void>;
    sendTransaction(txDetails?: Truffle.TransactionDetails): Promise<string>;
    estimateGas(txDetails?: Truffle.TransactionDetails): Promise<number>;
  };

  slashScore: {
    (
      _user: string,
      cToken: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      _user: string,
      cToken: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<void>;
    sendTransaction(
      _user: string,
      cToken: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      _user: string,
      cToken: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  snapshot(
    arg0: string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<[BN, BN, BN]>;

  spin: {
    (txDetails?: Truffle.TransactionDetails): Promise<
      Truffle.TransactionResponse<AllEvents>
    >;
    call(txDetails?: Truffle.TransactionDetails): Promise<void>;
    sendTransaction(txDetails?: Truffle.TransactionDetails): Promise<string>;
    estimateGas(txDetails?: Truffle.TransactionDetails): Promise<number>;
  };

  start(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  startDate(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  supplyMultiplier(
    arg0: string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<BN>;

  transferOwnership: {
    (newOwner: string, txDetails?: Truffle.TransactionDetails): Promise<
      Truffle.TransactionResponse<AllEvents>
    >;
    call(
      newOwner: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<void>;
    sendTransaction(
      newOwner: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      newOwner: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  updateCollScore: {
    (
      _avatar: string,
      cToken: string,
      amount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      _avatar: string,
      cToken: string,
      amount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<void>;
    sendTransaction(
      _avatar: string,
      cToken: string,
      amount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      _avatar: string,
      cToken: string,
      amount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  updateDebtScore: {
    (
      _avatar: string,
      cToken: string,
      amount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      _avatar: string,
      cToken: string,
      amount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<void>;
    sendTransaction(
      _avatar: string,
      cToken: string,
      amount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      _avatar: string,
      cToken: string,
      amount: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  updateIndex: {
    (cTokens: string[], txDetails?: Truffle.TransactionDetails): Promise<
      Truffle.TransactionResponse<AllEvents>
    >;
    call(
      cTokens: string[],
      txDetails?: Truffle.TransactionDetails
    ): Promise<void>;
    sendTransaction(
      cTokens: string[],
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      cTokens: string[],
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  user(_user: string, txDetails?: Truffle.TransactionDetails): Promise<string>;

  userScore(
    arg0: string,
    arg1: string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<[BN, BN, BN]>;

  methods: {
    GLOBAL_USER(txDetails?: Truffle.TransactionDetails): Promise<string>;

    borrowMultiplier(
      arg0: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;

    checkpoints(
      arg0: string,
      arg1: string,
      arg2: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<[BN, BN, BN]>;

    collAsset(
      cToken: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;

    comptroller(txDetails?: Truffle.TransactionDetails): Promise<string>;

    debtAsset(
      cToken: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;

    endDate(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    getCollGlobalScore(
      cToken: string,
      time: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;

    getCollScore(
      _user: string,
      cToken: string,
      time: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;

    getCurrentBalance(
      user: string,
      asset: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;

    getDebtGlobalScore(
      cToken: string,
      time: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;

    getDebtScore(
      _user: string,
      cToken: string,
      time: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;

    getScore(
      user: string,
      asset: string,
      time: number | BN | string,
      spinStart: number | BN | string,
      checkPointHint: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;

    initialSnapshot(
      arg0: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<[BN, BN, BN]>;

    isOwner(txDetails?: Truffle.TransactionDetails): Promise<boolean>;

    owner(txDetails?: Truffle.TransactionDetails): Promise<string>;

    registry(txDetails?: Truffle.TransactionDetails): Promise<string>;

    renounceOwnership: {
      (txDetails?: Truffle.TransactionDetails): Promise<
        Truffle.TransactionResponse<AllEvents>
      >;
      call(txDetails?: Truffle.TransactionDetails): Promise<void>;
      sendTransaction(txDetails?: Truffle.TransactionDetails): Promise<string>;
      estimateGas(txDetails?: Truffle.TransactionDetails): Promise<number>;
    };

    slashScore: {
      (
        _user: string,
        cToken: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        _user: string,
        cToken: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<void>;
      sendTransaction(
        _user: string,
        cToken: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        _user: string,
        cToken: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    snapshot(
      arg0: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<[BN, BN, BN]>;

    spin: {
      (txDetails?: Truffle.TransactionDetails): Promise<
        Truffle.TransactionResponse<AllEvents>
      >;
      call(txDetails?: Truffle.TransactionDetails): Promise<void>;
      sendTransaction(txDetails?: Truffle.TransactionDetails): Promise<string>;
      estimateGas(txDetails?: Truffle.TransactionDetails): Promise<number>;
    };

    start(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    startDate(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    supplyMultiplier(
      arg0: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;

    transferOwnership: {
      (newOwner: string, txDetails?: Truffle.TransactionDetails): Promise<
        Truffle.TransactionResponse<AllEvents>
      >;
      call(
        newOwner: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<void>;
      sendTransaction(
        newOwner: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        newOwner: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    updateCollScore: {
      (
        _avatar: string,
        cToken: string,
        amount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        _avatar: string,
        cToken: string,
        amount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<void>;
      sendTransaction(
        _avatar: string,
        cToken: string,
        amount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        _avatar: string,
        cToken: string,
        amount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    updateDebtScore: {
      (
        _avatar: string,
        cToken: string,
        amount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        _avatar: string,
        cToken: string,
        amount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<void>;
      sendTransaction(
        _avatar: string,
        cToken: string,
        amount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        _avatar: string,
        cToken: string,
        amount: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    updateIndex: {
      (cTokens: string[], txDetails?: Truffle.TransactionDetails): Promise<
        Truffle.TransactionResponse<AllEvents>
      >;
      call(
        cTokens: string[],
        txDetails?: Truffle.TransactionDetails
      ): Promise<void>;
      sendTransaction(
        cTokens: string[],
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        cTokens: string[],
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    user(
      _user: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;

    userScore(
      arg0: string,
      arg1: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<[BN, BN, BN]>;
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
