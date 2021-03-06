import * as b from "../types/index";

export class BAccounts {
  private accounts!: Truffle.Accounts;

  public deployer: string;

  public user1: string;
  public user2: string;
  public user3: string;
  public user4: string;
  public user5: string;

  public member1: string;
  public member2: string;
  public member3: string;
  public member4: string;

  public other: string;

  public dummy1: string;
  public dummy2: string;
  public dummy3: string;
  public dummy4: string;

  constructor(_accounts: Truffle.Accounts) {
    this.accounts = _accounts;
    this.deployer = _accounts[0];

    // user
    this.user1 = _accounts[1];
    this.user2 = _accounts[2];
    this.user3 = _accounts[3];
    this.user4 = _accounts[4];
    this.user5 = _accounts[5];

    this.member1 = _accounts[6];
    this.member2 = _accounts[7];
    this.member3 = _accounts[8];
    this.member4 = _accounts[9];
    //TODO also integrate with BProtocol class

    // other
    this.other = _accounts[10];

    // dummy
    this.dummy1 = _accounts[16];
    this.dummy2 = _accounts[17];
    this.dummy3 = _accounts[18];
    this.dummy4 = _accounts[19];
  }
}
