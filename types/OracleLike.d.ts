/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import BN from "bn.js";
import { EventData, PastEventOptions } from "web3-eth-contract";

export interface OracleLikeContract
  extends Truffle.Contract<OracleLikeInstance> {
  "new"(meta?: Truffle.TransactionDetails): Promise<OracleLikeInstance>;
}

type AllEvents = never;

export interface OracleLikeInstance extends Truffle.ContractInstance {
  getUnderlyingPrice(
    cToken: string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<BN>;

  methods: {
    getUnderlyingPrice(
      cToken: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;
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
