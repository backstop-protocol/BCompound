/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import BN from "bn.js";
import { EventData, PastEventOptions } from "web3-eth-contract";

export interface FlashLoanStubContract
  extends Truffle.Contract<FlashLoanStubInstance> {
  "new"(meta?: Truffle.TransactionDetails): Promise<FlashLoanStubInstance>;
}

type AllEvents = never;

export interface FlashLoanStubInstance extends Truffle.ContractInstance {
  borrow: {
    (
      arg0: string,
      _amount: number | BN | string,
      _data: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      arg0: string,
      _amount: number | BN | string,
      _data: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<void>;
    sendTransaction(
      arg0: string,
      _amount: number | BN | string,
      _data: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      arg0: string,
      _amount: number | BN | string,
      _data: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  deposit: {
    (txDetails?: Truffle.TransactionDetails): Promise<
      Truffle.TransactionResponse<AllEvents>
    >;
    call(txDetails?: Truffle.TransactionDetails): Promise<void>;
    sendTransaction(txDetails?: Truffle.TransactionDetails): Promise<string>;
    estimateGas(txDetails?: Truffle.TransactionDetails): Promise<number>;
  };

  methods: {
    borrow: {
      (
        arg0: string,
        _amount: number | BN | string,
        _data: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        arg0: string,
        _amount: number | BN | string,
        _data: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<void>;
      sendTransaction(
        arg0: string,
        _amount: number | BN | string,
        _data: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        arg0: string,
        _amount: number | BN | string,
        _data: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    deposit: {
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
