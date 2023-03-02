import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  getSimpleAccount
} from "./utils";
// @ts-ignore
import config from "../config.json";

describe("Openfort EIP4337 wallet testing", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployAndSetupAccount() {

    // Contracts are deployed using the first signer/account by default
    const [random1, entryPoint, firstOwner, secondOwner] = await ethers.getSigners();

    const OpenfortWallet = await ethers.getContractFactory("OpenfortWallet");
    const openfortWallet = await OpenfortWallet.deploy();

    const OpenfortWalletFactory = await ethers.getContractFactory("OpenfortWalletFactory");
    const openfortWalletFactory = await OpenfortWalletFactory.deploy();

    // Setup wallet
    await openfortWallet.connect(random1).setupWithEntrypoint(
      [firstOwner.address, secondOwner.address, "0x89A7111725ea66F2d03ad8197b87D94F06d0Eb77"],
      1,
      random1.address,
      "0x",
      random1.address,
      random1.address,
      0,
      random1.address,
      config.entryPoint
    );

    return { openfortWallet, openfortWalletFactory, random1, entryPoint, firstOwner, secondOwner };
  }

    it("Create and validate UserOperation", async function () {
      const { openfortWallet, openfortWalletFactory, random1, entryPoint, firstOwner, secondOwner } = await loadFixture(deployAndSetupAccount);
      const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
      const paymasterAPI = undefined

      const accountAPI = getSimpleAccount(
        provider,
        config.signingKey,
        config.entryPoint,
        config.simpleAccountFactory,
        paymasterAPI
      );

      // Confirm it's setup correctly
      expect(await openfortWallet.entryPoint()).to.equal(config.entryPoint);

      // Create user operation and sign it
      const userOp = await accountAPI.createSignedUserOp({
        target: config.entryPoint,
        data: "0x"
      })

      // Account API is based off of the simple account contract
      // We're using it's API to create this but we'll set some values
      // we would expect in our real implementation
      userOp.nonce = 2;
      userOp.initCode = '0x';

      // Get hash of the userOp
      const userOpHash2 = await accountAPI.getUserOpHash(userOp);

      // Attempt to validate the created userOp with an address which isn't our entry point (random1)
      await expect (openfortWallet.connect(random1).validateUserOp(
          userOp, userOpHash2, 0
      )).to.be.revertedWithCustomError(openfortWallet, "EntryPointInvalid");

      // Make random1 our new entryPoint
      await openfortWallet.connect(secondOwner).updateEntryPoint(random1.address);

      // Deposit ether so call does not fail for missingAccountFunds
      await secondOwner.sendTransaction({
        to: openfortWallet.address,
        value: ethers.utils.parseEther("100.0"), // Sends exactly 1.0 ether
      });

      // Attempt to validate the created userOp with our new entry point
      // Also include missingAccountFunds
      const missingAccountFunds = 1;
      await openfortWallet.connect(random1).validateUserOp(userOp, userOpHash2, missingAccountFunds);

      // debug to be removed
      const x = await openfortWallet.connect(random1).getX();
      const y = await openfortWallet.connect(random1).getY();
      console.log(`x:${x} ++++ y:${y} `);


      expect(true);
    });
 
    it.skip("Create and validate UserOperation DEBUG VERSION", async function () {
    const { openfortWallet, openfortWalletFactory, random1, entryPoint, secondOwner } = await loadFixture(deployAndSetupAccount);
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
      [owner, secondOwner.address, "0x39Ff807dc69D325b209Ce96BB8D70aB9b99EAd06"],
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
    console.log(`Check accoutAPI address ${accountAPI.accountAddress}`)
    console.log(`Random1 wallet address: ${random1.address}`);
    console.log(`config.entryPoint wallet address: ${config.entryPoint}`);

    // Create user operation and sign it
    const userOp = await accountAPI.createSignedUserOp({
      target: random1.address,
      data: "0x"
    })

    // Account API is based off of the simple account contract
    // We're using it's API to create this but we'll set some values
    // we would expect in our real implementation
    userOp.nonce = 2;
    userOp.initCode = '0x';

    // Get hash of the userOp
    const userOpHash2 = await accountAPI.getUserOpHash(userOp);

    // debug
    console.log("============================");
    console.log(userOp.initCode);
    //console.log(userOp);
    //console.log(userOpHash2);
    //console.log(userOp.nonce);
    console.log("============================");


    // Attempt to validate the created userOp with an address which isn't our entry point (random1)
    await expect (openfortWallet.connect(random1).validateUserOp(
        userOp, userOpHash2, 0
    )).to.be.revertedWithCustomError(openfortWallet, "EntryPointInvalid");

    // Make random1 our new entryPoint
    await openfortWallet.connect(secondOwner).updateEntryPoint(random1.address);


    // Deposit ether so call does not fail for missingAccountFunds
    await secondOwner.sendTransaction({
      to: openfortWallet.address,
      value: ethers.utils.parseEther("100.0"), // Sends exactly 1.0 ether
    });

    // Attempt to validate the created userOp with our new entry point
    // Also include missingAccountFunds
    const missingAccountFunds = 1;
    await openfortWallet.connect(random1).validateUserOp(userOp, userOpHash2, missingAccountFunds);

    // debug to be removed
    const testNum2 = await openfortWallet.connect(random1).getTest();
    const x = await openfortWallet.connect(random1).getX();
    const y = await openfortWallet.connect(random1).getY();
    console.log(testNum2);
    console.log(`x:${x} ++++ y:${y} `);

    expect(true);
    });

    it.skip("executeUserOperationAsEntryPoint to remove an owner", async function () {
      const { openfortWallet, openfortWalletFactory, random1, entryPoint, firstOwner, secondOwner } = await loadFixture(deployAndSetupAccount);
      const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
      const paymasterAPI = undefined

      const accountAPI = getSimpleAccount(
        provider,
        config.signingKey,
        config.entryPoint,
        config.simpleAccountFactory,
        paymasterAPI
      );

      // Confirm gnosis safe setup correctly
      expect(await openfortWallet.entryPoint()).to.equal(config.entryPoint);

      // Encode removeOwner function to be passed into executeUserOperationAsEntryPoint
      const encodedRemoveOwner = openfortWallet.interface.encodeFunctionData('removeOwner', [firstOwner.address, secondOwner.address, 1]);
     
      // Encode remove owner within an execTransaction call
      //const encodedExecTransaction = 

      // Then we encode executeUserOperationAsEntryPoint to pass into our UserOp
      const encodedUserOp = openfortWallet.interface.encodeFunctionData('executeUserOperationAsEntryPoint', [random1.address,0,encodedRemoveOwner,0]);

      // Create user operation and sign it
      const userOp = await accountAPI.createSignedUserOp({
        target: random1.address,
        data: encodedUserOp
      })

      userOp.nonce = 2;
      userOp.initCode = '0x';

      // Get hash of the userOp
      const userOpHash2 = await accountAPI.getUserOpHash(userOp);

      // Make random1 our new entryPoint
      await openfortWallet.connect(secondOwner).updateEntryPoint(random1.address);

      // Attempt to validate the created userOp with our new entry point
      await openfortWallet.connect(random1).validateUserOp(userOp, userOpHash2, 0);

      // Check secondOwner.address is an owner
      expect (await openfortWallet.isOwner(secondOwner.address)).to.equal(true);

      // Get nonce 
      const nonce = await openfortWallet.nonce();

      // Transaction fails as non-entry point address
      await expect ( 
        openfortWallet.connect(secondOwner).executeUserOperationAsEntryPoint(openfortWallet.address,0,encodedRemoveOwner,0
      )).to.revertedWithCustomError(openfortWallet, "EntryPointInvalid");

      // Send transaction with entrypoint
      await openfortWallet.connect(random1).executeUserOperationAsEntryPoint(openfortWallet.address,0,encodedRemoveOwner,0);

      // Check secondOwner.address is now not an owner
      expect (await openfortWallet.isOwner(secondOwner.address)).to.equal(false);


      // MUST update test to use execTransaction
      // Check none incremented correctly 
      //expect (await openfortWallet.nonce()).to.equal(nonce.add(1));

    });

    it.skip("executeUserOperationAsEntryPoint as delegate call", async function () {
      const { openfortWallet, openfortWalletFactory, random1, entryPoint, firstOwner, secondOwner } = await loadFixture(deployAndSetupAccount);
      const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
      const paymasterAPI = undefined

      const accountAPI = getSimpleAccount(
        provider,
        config.signingKey,
        config.entryPoint,
        config.simpleAccountFactory,
        paymasterAPI
      );

      // Confirm gnosis safe setup correctly
      expect(await openfortWallet.entryPoint()).to.equal(config.entryPoint);

      // Encode removeOwner function to be passed into executeUserOperationAsEntryPoint
      const encodedRemoveOwner = openfortWallet.interface.encodeFunctionData('removeOwner', [firstOwner.address, secondOwner.address, 1]);
     
      // Then we encode executeUserOperationAsEntryPoint to pass into our UserOp
      const encodedUserOp = openfortWallet.interface.encodeFunctionData('executeUserOperationAsEntryPoint', [random1.address,0,encodedRemoveOwner,0]);

      // Create user operation and sign it
      const userOp = await accountAPI.createSignedUserOp({
        target: random1.address,
        data: encodedUserOp
      })

      userOp.nonce = 2;
      userOp.initCode = '0x';

      // Get hash of the userOp
      const userOpHash2 = await accountAPI.getUserOpHash(userOp);

      // Make random1 our new entryPoint
      await openfortWallet.connect(secondOwner).updateEntryPoint(random1.address);

      // Attempt to validate the created userOp with our new entry point
      await openfortWallet.connect(random1).validateUserOp(userOp, userOpHash2, 0);

      // Check secondOwner.address is an owner
      expect (await openfortWallet.isOwner(secondOwner.address)).to.equal(true);

      // Send transaction with entrypoint
      await openfortWallet.connect(random1).executeUserOperationAsEntryPoint(openfortWallet.address,0,encodedRemoveOwner,0);

      // Check secondOwner.address is now not an owner
      expect (await openfortWallet.isOwner(secondOwner.address)).to.equal(false);

  });
});
