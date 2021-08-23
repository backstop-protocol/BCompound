/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import BN from "bn.js";
import { EventData, PastEventOptions } from "web3-eth-contract";

export interface ComptrollerLikeContract
  extends Truffle.Contract<ComptrollerLikeInstance> {
  "new"(meta?: Truffle.TransactionDetails): Promise<ComptrollerLikeInstance>;
}

type AllEvents = never;

export interface ComptrollerLikeInstance extends Truffle.ContractInstance {
  allMarkets(
    m: number | BN | string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<string>;

  claimComp: {
    (holder: string, txDetails?: Truffle.TransactionDetails): Promise<
      Truffle.TransactionResponse<AllEvents>
    >;
    call(holder: string, txDetails?: Truffle.TransactionDetails): Promise<void>;
    sendTransaction(
      holder: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      holder: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  compAccrued(
    holder: string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<BN>;

  getAllMarkets(txDetails?: Truffle.TransactionDetails): Promise<string[]>;

  getAssetsIn(
    account: string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<string[]>;

  getCompAddress(txDetails?: Truffle.TransactionDetails): Promise<string>;

  markets(
    cTokenAddress: string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<[boolean, BN, boolean]>;

  oracle(txDetails?: Truffle.TransactionDetails): Promise<string>;

  methods: {
    allMarkets(
      m: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;

    claimComp: {
      (holder: string, txDetails?: Truffle.TransactionDetails): Promise<
        Truffle.TransactionResponse<AllEvents>
      >;
      call(
        holder: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<void>;
      sendTransaction(
        holder: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        holder: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    compAccrued(
      holder: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;

    getAllMarkets(txDetails?: Truffle.TransactionDetails): Promise<string[]>;

    getAssetsIn(
      account: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string[]>;

    getCompAddress(txDetails?: Truffle.TransactionDetails): Promise<string>;

    markets(
      cTokenAddress: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<[boolean, BN, boolean]>;

    oracle(txDetails?: Truffle.TransactionDetails): Promise<string>;
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