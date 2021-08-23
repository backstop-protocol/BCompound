/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import BN from "bn.js";
import { EventData, PastEventOptions } from "web3-eth-contract";

export interface ComptrollerV1StorageContract
  extends Truffle.Contract<ComptrollerV1StorageInstance> {
  "new"(
    meta?: Truffle.TransactionDetails
  ): Promise<ComptrollerV1StorageInstance>;
}

type AllEvents = never;

export interface ComptrollerV1StorageInstance extends Truffle.ContractInstance {
  accountAssets(
    arg0: string,
    arg1: number | BN | string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<string>;

  admin(txDetails?: Truffle.TransactionDetails): Promise<string>;

  closeFactorMantissa(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  comptrollerImplementation(
    txDetails?: Truffle.TransactionDetails
  ): Promise<string>;

  liquidationIncentiveMantissa(
    txDetails?: Truffle.TransactionDetails
  ): Promise<BN>;

  maxAssets(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  oracle(txDetails?: Truffle.TransactionDetails): Promise<string>;

  pendingAdmin(txDetails?: Truffle.TransactionDetails): Promise<string>;

  pendingComptrollerImplementation(
    txDetails?: Truffle.TransactionDetails
  ): Promise<string>;

  methods: {
    accountAssets(
      arg0: string,
      arg1: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;

    admin(txDetails?: Truffle.TransactionDetails): Promise<string>;

    closeFactorMantissa(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    comptrollerImplementation(
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;

    liquidationIncentiveMantissa(
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;

    maxAssets(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    oracle(txDetails?: Truffle.TransactionDetails): Promise<string>;

    pendingAdmin(txDetails?: Truffle.TransactionDetails): Promise<string>;

    pendingComptrollerImplementation(
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
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