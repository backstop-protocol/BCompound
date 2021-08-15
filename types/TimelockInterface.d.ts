/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import BN from "bn.js";
import { EventData, PastEventOptions } from "web3-eth-contract";

export interface TimelockInterfaceContract
  extends Truffle.Contract<TimelockInterfaceInstance> {
  "new"(meta?: Truffle.TransactionDetails): Promise<TimelockInterfaceInstance>;
}

type AllEvents = never;

export interface TimelockInterfaceInstance extends Truffle.ContractInstance {
  GRACE_PERIOD(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  acceptAdmin: {
    (txDetails?: Truffle.TransactionDetails): Promise<
      Truffle.TransactionResponse<AllEvents>
    >;
    call(txDetails?: Truffle.TransactionDetails): Promise<void>;
    sendTransaction(txDetails?: Truffle.TransactionDetails): Promise<string>;
    estimateGas(txDetails?: Truffle.TransactionDetails): Promise<number>;
  };

  cancelTransaction: {
    (
      target: string,
      value: number | BN | string,
      signature: string,
      data: string,
      eta: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      target: string,
      value: number | BN | string,
      signature: string,
      data: string,
      eta: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<void>;
    sendTransaction(
      target: string,
      value: number | BN | string,
      signature: string,
      data: string,
      eta: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      target: string,
      value: number | BN | string,
      signature: string,
      data: string,
      eta: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  delay(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  executeTransaction: {
    (
      target: string,
      value: number | BN | string,
      signature: string,
      data: string,
      eta: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      target: string,
      value: number | BN | string,
      signature: string,
      data: string,
      eta: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    sendTransaction(
      target: string,
      value: number | BN | string,
      signature: string,
      data: string,
      eta: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      target: string,
      value: number | BN | string,
      signature: string,
      data: string,
      eta: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  queueTransaction: {
    (
      target: string,
      value: number | BN | string,
      signature: string,
      data: string,
      eta: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      target: string,
      value: number | BN | string,
      signature: string,
      data: string,
      eta: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    sendTransaction(
      target: string,
      value: number | BN | string,
      signature: string,
      data: string,
      eta: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      target: string,
      value: number | BN | string,
      signature: string,
      data: string,
      eta: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  queuedTransactions(
    hash: string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<boolean>;

  methods: {
    GRACE_PERIOD(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    acceptAdmin: {
      (txDetails?: Truffle.TransactionDetails): Promise<
        Truffle.TransactionResponse<AllEvents>
      >;
      call(txDetails?: Truffle.TransactionDetails): Promise<void>;
      sendTransaction(txDetails?: Truffle.TransactionDetails): Promise<string>;
      estimateGas(txDetails?: Truffle.TransactionDetails): Promise<number>;
    };

    cancelTransaction: {
      (
        target: string,
        value: number | BN | string,
        signature: string,
        data: string,
        eta: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        target: string,
        value: number | BN | string,
        signature: string,
        data: string,
        eta: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<void>;
      sendTransaction(
        target: string,
        value: number | BN | string,
        signature: string,
        data: string,
        eta: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        target: string,
        value: number | BN | string,
        signature: string,
        data: string,
        eta: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    delay(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    executeTransaction: {
      (
        target: string,
        value: number | BN | string,
        signature: string,
        data: string,
        eta: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        target: string,
        value: number | BN | string,
        signature: string,
        data: string,
        eta: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      sendTransaction(
        target: string,
        value: number | BN | string,
        signature: string,
        data: string,
        eta: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        target: string,
        value: number | BN | string,
        signature: string,
        data: string,
        eta: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    queueTransaction: {
      (
        target: string,
        value: number | BN | string,
        signature: string,
        data: string,
        eta: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        target: string,
        value: number | BN | string,
        signature: string,
        data: string,
        eta: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      sendTransaction(
        target: string,
        value: number | BN | string,
        signature: string,
        data: string,
        eta: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        target: string,
        value: number | BN | string,
        signature: string,
        data: string,
        eta: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    queuedTransactions(
      hash: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<boolean>;
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
