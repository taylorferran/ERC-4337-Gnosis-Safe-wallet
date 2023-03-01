import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  getUserOpHash,
  getSimpleAccount
} from "./utils";
// @ts-ignore
import config from "../config.json";
import { SimpleAccountAPI } from "@account-abstraction/sdk";

describe("Openfort wallet testing", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployAndSetupAccount() {


    // Contracts are deployed using the first signer/account by default
    const [random1, random2] = await ethers.getSigners();

    const OpenfortWallet = await ethers.getContractFactory("OpenfortWallet");
    const openfortWallet = await OpenfortWallet.deploy();

    const OpenfortWalletFactory = await ethers.getContractFactory("OpenfortWalletFactory");
    const openfortWalletFactory = await OpenfortWalletFactory.deploy();

    return { openfortWallet, openfortWalletFactory, random1, random2 };
  }

  describe("Deployment", function () {
    it("Create and validate UserOperation", async function () {
      const { openfortWallet, openfortWalletFactory, random1, random2 } = await loadFixture(deployAndSetupAccount);
      const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
      const paymasterAPI = undefined
      
      const accountAPI = getSimpleAccount(
        provider,
        config.signingKey,
        config.entryPoint,
        config.simpleAccountFactory,
        paymasterAPI
      );

      const owner = await accountAPI.getCounterFactualAddress();

      // Setup wallet 
      await openfortWallet.connect(random1).setupWithEntrypoint(
        [owner],
        1,
        random1.address,
        "0x",
        random1.address,
        random1.address,
        0,
        random1.address,
        config.entryPoint
      );

      // Confirm it's setup correctly
      expect(await openfortWallet.entryPoint()).to.equal(config.entryPoint);

      console.log(`SimpleAccount address: ${owner}`);
      console.log(`Openfort wallet address: ${openfortWallet.address}`);
      console.log(`Random1 wallet address: ${random1.address}`);

      // Create user operation and sign it
      const userOp = await accountAPI.createSignedUserOp({
        target: random1.address,
        data: "0x"
      })

      console.log(userOp);

      const userOpHash2 = await accountAPI.getUserOpHash(userOp);

      console.log(userOpHash2);
      console.log("============================");

      const validateUserOpOutput = await openfortWallet.connect(random1).validateUserOp(
        userOp, userOpHash2, 0 
      )
      
      console.log(validateUserOpOutput);

      // Validate user operation with contract account
      expect(await openfortWallet.connect(random1).validateUserOp(
        userOp, userOpHash2, 0
      )).to.equal(0);


      expect(true);
    });
  });
});
