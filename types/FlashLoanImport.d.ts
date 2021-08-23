/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import BN from "bn.js";
import { EventData, PastEventOptions } from "web3-eth-contract";

export interface FlashLoanImportContract
  extends Truffle.Contract<FlashLoanImportInstance> {
  "new"(meta?: Truffle.TransactionDetails): Promise<FlashLoanImportInstance>;
}

type AllEvents = never;

export interface FlashLoanImportInstance extends Truffle.ContractInstance {
  flashImport: {
    (
      cTokenCollateral: string[],
      collateralUnderlying: string[],
      cTokenDebt: string[],
      debtUnderlying: string[],
      importer: string,
      ethAmountToFlashBorrow: number | BN | string,
      flash: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      cTokenCollateral: string[],
      collateralUnderlying: string[],
      cTokenDebt: string[],
      debtUnderlying: string[],
      importer: string,
      ethAmountToFlashBorrow: number | BN | string,
      flash: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<void>;
    sendTransaction(
      cTokenCollateral: string[],
      collateralUnderlying: string[],
      cTokenDebt: string[],
      debtUnderlying: string[],
      importer: string,
      ethAmountToFlashBorrow: number | BN | string,
      flash: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      cTokenCollateral: string[],
      collateralUnderlying: string[],
      cTokenDebt: string[],
      debtUnderlying: string[],
      importer: string,
      ethAmountToFlashBorrow: number | BN | string,
      flash: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  methods: {
    flashImport: {
      (
        cTokenCollateral: string[],
        collateralUnderlying: string[],
        cTokenDebt: string[],
        debtUnderlying: string[],
        importer: string,
        ethAmountToFlashBorrow: number | BN | string,
        flash: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        cTokenCollateral: string[],
        collateralUnderlying: string[],
        cTokenDebt: string[],
        debtUnderlying: string[],
        importer: string,
        ethAmountToFlashBorrow: number | BN | string,
        flash: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<void>;
      sendTransaction(
        cTokenCollateral: string[],
        collateralUnderlying: string[],
        cTokenDebt: string[],
        debtUnderlying: string[],
        importer: string,
        ethAmountToFlashBorrow: number | BN | string,
        flash: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        cTokenCollateral: string[],
        collateralUnderlying: string[],
        cTokenDebt: string[],
        debtUnderlying: string[],
        importer: string,
        ethAmountToFlashBorrow: number | BN | string,
        flash: string,
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