/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import BN from "bn.js";
import { EventData, PastEventOptions } from "web3-eth-contract";

export interface LiquidationMachineContract
  extends Truffle.Contract<LiquidationMachineInstance> {
  "new"(
    vat_: string,
    end_: string,
    pool_: string,
    real_: string,
    meta?: Truffle.TransactionDetails
  ): Promise<LiquidationMachineInstance>;
}

export interface LogNote {
  name: "LogNote";
  args: {
    sig: string;
    usr: string;
    arg1: string;
    arg2: string;
    data: string;
    0: string;
    1: string;
    2: string;
    3: string;
    4: string;
  };
}

export interface NewCdp {
  name: "NewCdp";
  args: {
    usr: string;
    own: string;
    cdp: BN;
    0: string;
    1: string;
    2: BN;
  };
}

type AllEvents = NewCdp;

export interface LiquidationMachineInstance extends Truffle.ContractInstance {
  GRACE(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  WAD(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  bite: {
    (
      cdp: number | BN | string,
      dart: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      cdp: number | BN | string,
      dart: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;
    sendTransaction(
      cdp: number | BN | string,
      dart: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      cdp: number | BN | string,
      dart: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  bitten(
    cdp: number | BN | string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<boolean>;

  cdpAllow: {
    (
      cdp: number | BN | string,
      usr: string,
      ok: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      cdp: number | BN | string,
      usr: string,
      ok: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<void>;
    sendTransaction(
      cdp: number | BN | string,
      usr: string,
      ok: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      cdp: number | BN | string,
      usr: string,
      ok: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  cdpCan(
    arg0: string,
    arg1: number | BN | string,
    arg2: string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<BN>;

  cdpi(txDetails?: Truffle.TransactionDetails): Promise<BN>;

  count(arg0: string, txDetails?: Truffle.TransactionDetails): Promise<BN>;

  cushion(
    arg0: number | BN | string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<BN>;

  end(txDetails?: Truffle.TransactionDetails): Promise<string>;

  enter: {
    (
      src: string,
      cdp: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      src: string,
      cdp: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<void>;
    sendTransaction(
      src: string,
      cdp: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      src: string,
      cdp: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  first(arg0: string, txDetails?: Truffle.TransactionDetails): Promise<BN>;

  frob: {
    (
      cdp: number | BN | string,
      dink: number | BN | string,
      dart: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      cdp: number | BN | string,
      dink: number | BN | string,
      dart: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<void>;
    sendTransaction(
      cdp: number | BN | string,
      dink: number | BN | string,
      dart: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      cdp: number | BN | string,
      dink: number | BN | string,
      dart: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  give: {
    (
      cdp: number | BN | string,
      dst: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      cdp: number | BN | string,
      dst: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<void>;
    sendTransaction(
      cdp: number | BN | string,
      dst: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      cdp: number | BN | string,
      dst: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  ilks(
    arg0: number | BN | string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<string>;

  last(arg0: string, txDetails?: Truffle.TransactionDetails): Promise<BN>;

  left(
    arg0: number | BN | string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<BN>;

  list(
    arg0: number | BN | string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<[BN, BN]>;

  move: {
    (
      cdp: number | BN | string,
      dst: string,
      rad: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      cdp: number | BN | string,
      dst: string,
      rad: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<void>;
    sendTransaction(
      cdp: number | BN | string,
      dst: string,
      rad: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      cdp: number | BN | string,
      dst: string,
      rad: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  open: {
    (ilk: string, usr: string, txDetails?: Truffle.TransactionDetails): Promise<
      Truffle.TransactionResponse<AllEvents>
    >;
    call(
      ilk: string,
      usr: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;
    sendTransaction(
      ilk: string,
      usr: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      ilk: string,
      usr: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  out(
    arg0: number | BN | string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<boolean>;

  owns(
    arg0: number | BN | string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<string>;

  pool(txDetails?: Truffle.TransactionDetails): Promise<string>;

  quit: {
    (
      cdp: number | BN | string,
      dst: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      cdp: number | BN | string,
      dst: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<void>;
    sendTransaction(
      cdp: number | BN | string,
      dst: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      cdp: number | BN | string,
      dst: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  real(txDetails?: Truffle.TransactionDetails): Promise<string>;

  score(txDetails?: Truffle.TransactionDetails): Promise<string>;

  shift: {
    (
      cdpSrc: number | BN | string,
      cdpDst: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      cdpSrc: number | BN | string,
      cdpDst: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<void>;
    sendTransaction(
      cdpSrc: number | BN | string,
      cdpDst: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      cdpSrc: number | BN | string,
      cdpDst: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  tic(
    arg0: number | BN | string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<BN>;

  topup: {
    (
      cdp: number | BN | string,
      dtopup: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      cdp: number | BN | string,
      dtopup: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<void>;
    sendTransaction(
      cdp: number | BN | string,
      dtopup: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      cdp: number | BN | string,
      dtopup: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  untopByPool: {
    (
      cdp: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      cdp: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<void>;
    sendTransaction(
      cdp: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      cdp: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  urnAllow: {
    (
      usr: string,
      ok: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<Truffle.TransactionResponse<AllEvents>>;
    call(
      usr: string,
      ok: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<void>;
    sendTransaction(
      usr: string,
      ok: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;
    estimateGas(
      usr: string,
      ok: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<number>;
  };

  urnCan(
    arg0: string,
    arg1: string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<BN>;

  urns(
    arg0: number | BN | string,
    txDetails?: Truffle.TransactionDetails
  ): Promise<string>;

  vat(txDetails?: Truffle.TransactionDetails): Promise<string>;

  methods: {
    GRACE(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    WAD(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    bite: {
      (
        cdp: number | BN | string,
        dart: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        cdp: number | BN | string,
        dart: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<BN>;
      sendTransaction(
        cdp: number | BN | string,
        dart: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        cdp: number | BN | string,
        dart: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    bitten(
      cdp: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<boolean>;

    cdpAllow: {
      (
        cdp: number | BN | string,
        usr: string,
        ok: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        cdp: number | BN | string,
        usr: string,
        ok: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<void>;
      sendTransaction(
        cdp: number | BN | string,
        usr: string,
        ok: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        cdp: number | BN | string,
        usr: string,
        ok: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    cdpCan(
      arg0: string,
      arg1: number | BN | string,
      arg2: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;

    cdpi(txDetails?: Truffle.TransactionDetails): Promise<BN>;

    count(arg0: string, txDetails?: Truffle.TransactionDetails): Promise<BN>;

    cushion(
      arg0: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;

    end(txDetails?: Truffle.TransactionDetails): Promise<string>;

    enter: {
      (
        src: string,
        cdp: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        src: string,
        cdp: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<void>;
      sendTransaction(
        src: string,
        cdp: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        src: string,
        cdp: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    first(arg0: string, txDetails?: Truffle.TransactionDetails): Promise<BN>;

    frob: {
      (
        cdp: number | BN | string,
        dink: number | BN | string,
        dart: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        cdp: number | BN | string,
        dink: number | BN | string,
        dart: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<void>;
      sendTransaction(
        cdp: number | BN | string,
        dink: number | BN | string,
        dart: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        cdp: number | BN | string,
        dink: number | BN | string,
        dart: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    give: {
      (
        cdp: number | BN | string,
        dst: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        cdp: number | BN | string,
        dst: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<void>;
      sendTransaction(
        cdp: number | BN | string,
        dst: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        cdp: number | BN | string,
        dst: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    ilks(
      arg0: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;

    last(arg0: string, txDetails?: Truffle.TransactionDetails): Promise<BN>;

    left(
      arg0: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;

    list(
      arg0: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<[BN, BN]>;

    move: {
      (
        cdp: number | BN | string,
        dst: string,
        rad: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        cdp: number | BN | string,
        dst: string,
        rad: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<void>;
      sendTransaction(
        cdp: number | BN | string,
        dst: string,
        rad: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        cdp: number | BN | string,
        dst: string,
        rad: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    open: {
      (
        ilk: string,
        usr: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        ilk: string,
        usr: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<BN>;
      sendTransaction(
        ilk: string,
        usr: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        ilk: string,
        usr: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    out(
      arg0: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<boolean>;

    owns(
      arg0: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;

    pool(txDetails?: Truffle.TransactionDetails): Promise<string>;

    quit: {
      (
        cdp: number | BN | string,
        dst: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        cdp: number | BN | string,
        dst: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<void>;
      sendTransaction(
        cdp: number | BN | string,
        dst: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        cdp: number | BN | string,
        dst: string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    real(txDetails?: Truffle.TransactionDetails): Promise<string>;

    score(txDetails?: Truffle.TransactionDetails): Promise<string>;

    shift: {
      (
        cdpSrc: number | BN | string,
        cdpDst: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        cdpSrc: number | BN | string,
        cdpDst: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<void>;
      sendTransaction(
        cdpSrc: number | BN | string,
        cdpDst: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        cdpSrc: number | BN | string,
        cdpDst: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    tic(
      arg0: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;

    topup: {
      (
        cdp: number | BN | string,
        dtopup: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        cdp: number | BN | string,
        dtopup: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<void>;
      sendTransaction(
        cdp: number | BN | string,
        dtopup: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        cdp: number | BN | string,
        dtopup: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    untopByPool: {
      (
        cdp: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        cdp: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<void>;
      sendTransaction(
        cdp: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        cdp: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    urnAllow: {
      (
        usr: string,
        ok: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        usr: string,
        ok: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<void>;
      sendTransaction(
        usr: string,
        ok: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        usr: string,
        ok: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    urnCan(
      arg0: string,
      arg1: string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<BN>;

    urns(
      arg0: number | BN | string,
      txDetails?: Truffle.TransactionDetails
    ): Promise<string>;

    vat(txDetails?: Truffle.TransactionDetails): Promise<string>;

    "flux(bytes32,uint256,address,uint256)": {
      (
        ilk: string,
        cdp: number | BN | string,
        dst: string,
        wad: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        ilk: string,
        cdp: number | BN | string,
        dst: string,
        wad: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<void>;
      sendTransaction(
        ilk: string,
        cdp: number | BN | string,
        dst: string,
        wad: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        ilk: string,
        cdp: number | BN | string,
        dst: string,
        wad: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<number>;
    };

    "flux(uint256,address,uint256)": {
      (
        cdp: number | BN | string,
        dst: string,
        wad: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<Truffle.TransactionResponse<AllEvents>>;
      call(
        cdp: number | BN | string,
        dst: string,
        wad: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<void>;
      sendTransaction(
        cdp: number | BN | string,
        dst: string,
        wad: number | BN | string,
        txDetails?: Truffle.TransactionDetails
      ): Promise<string>;
      estimateGas(
        cdp: number | BN | string,
        dst: string,
        wad: number | BN | string,
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