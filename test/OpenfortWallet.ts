import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  getSimpleAccount,
  Operation
} from "./utils";
// @ts-ignore
import config from "../config.json";

describe("Openfort EIP4337 wallet testing", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  // TODO update to use proxy 
  async function deployAndSetupAccount() {

    // Contracts are deployed using the first signer/account by default
    const [random1, entryPoint, firstOwner, secondOwner] = await ethers.getSigners();

    const OpenfortWallet = await ethers.getContractFactory("OpenfortWallet");
    const openfortWallet = await OpenfortWallet.deploy();

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

    return { openfortWallet, random1, entryPoint, firstOwner, secondOwner };
  }

    it("Create and validate UserOperation", async function () {
      const { openfortWallet, random1, secondOwner } = await loadFixture(deployAndSetupAccount);
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
      // TODO create our own userOp API leveraging the AA sdk
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
        value: ethers.utils.parseEther("100.0"), 
      });

      // Attempt to validate the created userOp with our new entry point
      // Also include missingAccountFunds
      const missingAccountFunds = 1;
      await openfortWallet.connect(random1).validateUserOp(userOp, userOpHash2, missingAccountFunds);

      expect(true);
    });

    it("executeUserOperationAsEntryPoint to remove an owner", async function () {
      const { openfortWallet, random1, entryPoint, firstOwner, secondOwner } = await loadFixture(deployAndSetupAccount);
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
      const encodedUserOp = openfortWallet.interface.encodeFunctionData('executeUserOperationAsEntryPoint', [random1.address,0,encodedRemoveOwner,Operation.Call]);

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
        openfortWallet.connect(secondOwner).executeUserOperationAsEntryPoint(openfortWallet.address,0,encodedRemoveOwner,Operation.Call
      )).to.revertedWithCustomError(openfortWallet, "EntryPointInvalid");

      // Send transaction with entrypoint
      await openfortWallet.connect(random1).executeUserOperationAsEntryPoint(openfortWallet.address,0,encodedRemoveOwner,Operation.Call);

      // Check secondOwner.address is now not an owner
      expect (await openfortWallet.isOwner(secondOwner.address)).to.equal(false);


      // MUST update test to use execTransaction
      // Check none incremented correctly 
      //expect (await openfortWallet.nonce()).to.equal(nonce.add(1));

    });

    it.skip("executeUserOperationAsEntryPoint as delegate call", async function () {
      const { openfortWallet, random1, entryPoint, firstOwner, secondOwner } = await loadFixture(deployAndSetupAccount);
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

      // Deploy test contract
      const OpenfortWallet2 = await ethers.getContractFactory("OpenfortWallet");
      const openfortWallet2 = await OpenfortWallet2.deploy();

      // Encode removeOwner function to be passed into executeUserOperationAsEntryPoint
      const encodedDelegateCall = OpenfortWallet2.interface.encodeFunctionData('updateEntryPoint', [firstOwner.address]);

      // Make random1 our new entryPoint
      await openfortWallet.connect(secondOwner).updateEntryPoint(random1.address);

      // Send transaction with entrypoint
      await openfortWallet.connect(random1).executeDelegateCallFromEntryPoint(openfortWallet2.address,"updateEntryPoint(address)",secondOwner.address);

      console.log("====");
      console.log(firstOwner.address);
      console.log(random1.address);
      console.log("====");

      // Confirm delegate call worked 
      expect(await openfortWallet.entryPoint()).to.equal(secondOwner.address);

    });

    it("executeMultipleUserOperationsAsEntryPoint to test batching", async function () {
      const { openfortWallet, random1, firstOwner, secondOwner } = await loadFixture(deployAndSetupAccount);

      // Create some signers to add as owners to the wallet
      const [user1, user2] = await ethers.getSigners();

      // Confirm gnosis safe setup correctly
      expect(await openfortWallet.entryPoint()).to.equal(config.entryPoint);
    
      // Encode addOwnerWithThreshold to add new users as owners
      const encodedAddUser1 = openfortWallet.interface.encodeFunctionData('addOwnerWithThreshold', [user1.address, 1]);
      const encodedAddUser2 = openfortWallet.interface.encodeFunctionData('addOwnerWithThreshold', [user2.address, 1]);

      // Remove one of the owners
      const encodedRemoveOwner = openfortWallet.interface.encodeFunctionData('removeOwner', [firstOwner.address, secondOwner.address, 1]);

      // Create struct for each transaction
      const addUser1Transaction = {to:openfortWallet.address,value:0,data:encodedAddUser1,operation:Operation.Call};
      const addUser2Transaction = {to:openfortWallet.address,value:0,data:encodedAddUser2,operation:Operation.Call};
      const removeOwnerTransaction = {to:openfortWallet.address,value:0,data:encodedRemoveOwner,operation:Operation.Call};

      // Create array of transactions 
      const transactionArray = [addUser1Transaction, addUser2Transaction, removeOwnerTransaction];

      // Make random1 our new entryPoint
      await openfortWallet.connect(secondOwner).updateEntryPoint(random1.address);

      // Check users are not owners
      expect (await openfortWallet.isOwner(user1.address)).to.equal(false);
      expect (await openfortWallet.isOwner(user2.address)).to.equal(false);
      expect (await openfortWallet.isOwner(secondOwner.address)).to.equal(true);

      // Send transaction with entrypoint
      await openfortWallet.connect(random1).executeMultipleUserOperationsAsEntryPoint(transactionArray);

      // Check secondOwner.address is now not an owner
      expect (await openfortWallet.isOwner(user1.address)).to.equal(true);
      expect (await openfortWallet.isOwner(user2.address)).to.equal(true);
      expect (await openfortWallet.isOwner(secondOwner.address)).to.equal(false);
    });

    it("executeMultipleUserOperationsAsEntryPoint to test atomicity of batching", async function () {
      const { openfortWallet, random1, entryPoint, firstOwner, secondOwner } = await loadFixture(deployAndSetupAccount);

      // Create some signers to add as owners to the wallet
      const [user1, user2] = await ethers.getSigners();

      // Confirm gnosis safe setup correctly
      expect(await openfortWallet.entryPoint()).to.equal(config.entryPoint);
    
      // Encode addOwnerWithThreshold to add new users as owners
      const encodedAddUser1 = openfortWallet.interface.encodeFunctionData('addOwnerWithThreshold', [user1.address, 1]);
      const encodedAddUser2 = openfortWallet.interface.encodeFunctionData('addOwnerWithThreshold', [user2.address, 1]);

      const addUser1Transaction = {to:openfortWallet.address,value:0,data:encodedAddUser1,operation:Operation.Call};
      const addUser2Transaction = {to:openfortWallet.address,value:0,data:encodedAddUser2,operation:Operation.Call};
      // We want this to fail and revert all transactions
      const addUser2TransactionAgain = {to:openfortWallet.address,value:0,data:encodedAddUser2,operation:Operation.Call};

      // Create array of transactions 
      const transactionArray = [addUser1Transaction, addUser2Transaction, addUser2TransactionAgain];

      // Make random1 our new entryPoint
      await openfortWallet.connect(secondOwner).updateEntryPoint(random1.address);

      // Check users are not owners
      expect (await openfortWallet.isOwner(user1.address)).to.equal(false);
      expect (await openfortWallet.isOwner(user2.address)).to.equal(false);

      // Send transaction with entrypoint
      await expect (
        openfortWallet.connect(random1).executeMultipleUserOperationsAsEntryPoint(transactionArray)
      ).to.revertedWithCustomError(openfortWallet, "BatchTransactionsFailed");

      // Check secondOwner.address is now not an owner
      expect (await openfortWallet.isOwner(user1.address)).to.equal(false);
      expect (await openfortWallet.isOwner(user2.address)).to.equal(false);
    });

    it("enable and run zodiac test module", async function () {
      const { openfortWallet, random1, entryPoint, firstOwner, secondOwner } = await loadFixture(deployAndSetupAccount);

      // Create a signer to act at the module caller
      const [zodiacSender] = await ethers.getSigners();

      // Create 
      const TestModule = await ethers.getContractFactory("TestModule");
      const testModule = await TestModule.deploy(zodiacSender.address, openfortWallet.address);

    /* 
      Try to run zodiac module without it enabled as sender, this should fail
      Enable the zodiac module on the safe contract
      Try to run the zodiac module again, payment should be made from safe to sender.
      Coins should increment.
      Should not be able to run this again.
    */


      // Try to call module before it is enabled
      await expect (
        testModule.connect(zodiacSender).triggerPayment()
      ).to.revertedWith("GS104");

      await openfortWallet.enableModule(testModule.address);

      // Deposit ether so payment does not fail 
      await secondOwner.sendTransaction({
        to: openfortWallet.address,
        value: ethers.utils.parseEther("10.0"), 
      });

      const provider = ethers.provider;
      // Get balance of safe wallet before txn 
      const balanceBeforeOfSafeWallet = await provider.getBalance(openfortWallet.address);

      // Check coins value before 
      expect ( await 
        testModule.connect(zodiacSender).getCoins()
      ).to.equal(0); 

      // Trigger module now it is enabled
      await testModule.connect(zodiacSender).triggerPayment();

      // Check coins value after 
      expect ( await
        testModule.connect(zodiacSender).getCoins()
        ).to.equal(10);

      // Check balance is -0.1 eth after
      expect ( await 
        provider.getBalance(openfortWallet.address)
      ).to.equal(balanceBeforeOfSafeWallet.sub(ethers.utils.parseEther("0.1"))); 

      // Check we can't rerun triggerPayment within the timeframe
      await expect (
        testModule.connect(zodiacSender).triggerPayment()
      ).to.revertedWith("Payment period has not elapsed");
    });
});
