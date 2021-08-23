/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import BN from "bn.js";
import { EventData, PastEventOptions } from "web3-eth-contract";

export interface IConnectorContract
  extends Truffle.Contract<IConnectorInstance> {
  "new"(meta?: Truffle.TransactionDetails): Promise<IConnectorInstance>;
}

type AllEvents = never;

export interface IConnectorInstance extends Truffle.ContractInstance {
  getGlobalScore(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  getUserScore(
    user: string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<BN>;

  methods: {
    getGlobalScore(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    getUserScore(
      user: string,
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