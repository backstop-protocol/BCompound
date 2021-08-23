/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import BN from "bn.js";
import { EventData, PastEventOptions } from "web3-eth-contract";

export interface IbTokenContract extends Truffle.Contract<IbTokenInstance> {
  "new"(meta?: Truffle.TransactionDetails): Promise<IbTokenInstance>;
}

type AllEvents = never;

export interface IbTokenInstance extends Truffle.ContractInstance {
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

  cToken(txDetails?: Truffle.TransactionDetails): Promise<string>;

  methods: {
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

    cToken(txDetails?: Truffle.TransactionDetails): Promise<string>;
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