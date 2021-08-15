/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import BN from "bn.js";
import { EventData, PastEventOptions } from "web3-eth-contract";

export interface CTokenStorageContract
  extends Truffle.Contract<CTokenStorageInstance> {
  "new"(meta?: Truffle.TransactionDetails): Promise<CTokenStorageInstance>;
}

type AllEvents = never;

export interface CTokenStorageInstance extends Truffle.ContractInstance {
  accrualBlockNumber(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  admin(txDetails?: Truffle.TransactionDetails): Promise<string>;

  borrowIndex(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  comptroller(txDetails?: Truffle.TransactionDetails): Promise<string>;

  decimals(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  interestRateModel(txDetails?: Truffle.TransactionDetails): Promise<string>;

  name(txDetails?: Truffle.TransactionDetails): Promise<string>;

  pendingAdmin(txDetails?: Truffle.TransactionDetails): Promise<string>;

  reserveFactorMantissa(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  symbol(txDetails?: Truffle.TransactionDetails): Promise<string>;

  totalBorrows(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  totalReserves(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  totalSupply(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  underlying(txDetails?: Truffle.TransactionDetails): Promise<string>;

  methods: {
    accrualBlockNumber(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    admin(txDetails?: Truffle.TransactionDetails): Promise<string>;

    borrowIndex(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    comptroller(txDetails?: Truffle.TransactionDetails): Promise<string>;

    decimals(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    interestRateModel(txDetails?: Truffle.TransactionDetails): Promise<string>;

    name(txDetails?: Truffle.TransactionDetails): Promise<string>;

    pendingAdmin(txDetails?: Truffle.TransactionDetails): Promise<string>;

    reserveFactorMantissa(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    symbol(txDetails?: Truffle.TransactionDetails): Promise<string>;

    totalBorrows(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    totalReserves(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    totalSupply(txDetails?: Truffle.TransactionDetails): Promise<BN>;

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
