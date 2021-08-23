/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import BN from "bn.js";
import { EventData, PastEventOptions } from "web3-eth-contract";

export interface FakePriceOracleContract
  extends Truffle.Contract<FakePriceOracleInstance> {
  "new"(meta?: Truffle.TransactionDetails): Promise<FakePriceOracleInstance>;
}

type AllEvents = never;

export interface FakePriceOracleInstance extends Truffle.ContractInstance {
  getUnderlyingPrice(
    cToken: string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<BN>;

  setPrice: {
    (
      cToken: string,
      newPrice: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      cToken: string,
      newPrice: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<void>;
    sendTransaction(
      cToken: string,
      newPrice: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      cToken: string,
      newPrice: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  methods: {
    getUnderlyingPrice(
      cToken: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;

    setPrice: {
      (
        cToken: string,
        newPrice: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        cToken: string,
        newPrice: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<void>;
      sendTransaction(
        cToken: string,
        newPrice: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        cToken: string,
        newPrice: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
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