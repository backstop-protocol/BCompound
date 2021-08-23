/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import BN from "bn.js";
import { EventData, PastEventOptions } from "web3-eth-contract";

export interface InterestRateModelContract
  extends Truffle.Contract<InterestRateModelInstance> {
  "new"(meta?: Truffle.TransactionDetails): Promise<InterestRateModelInstance>;
}

type AllEvents = never;

export interface InterestRateModelInstance extends Truffle.ContractInstance {
  getBorrowRate(
    cash: number | BN | string,
    borrows: number | BN | string,
    reserves: number | BN | string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<BN>;

  getSupplyRate(
    cash: number | BN | string,
    borrows: number | BN | string,
    reserves: number | BN | string,
    reserveFactorMantissa: number | BN | string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<BN>;

  isInterestRateModel(txDetails?: Truffle.TransactionDetails): Promise<boolean>;

  methods: {
    getBorrowRate(
      cash: number | BN | string,
      borrows: number | BN | string,
      reserves: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;

    getSupplyRate(
      cash: number | BN | string,
      borrows: number | BN | string,
      reserves: number | BN | string,
      reserveFactorMantissa: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;

    isInterestRateModel(
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