const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { parseEther, defaultAbiCoder } = require("ethers/lib/utils");
const { keccak256 } = require("ethereumjs-util");
const { SimpleAccountAPI, createSignedUserOp } = require("@account-abstraction/sdk");

describe("Openfort EIP4337 wallet testing", function () {

    async function deployAndSetupSafeWallet() {
        const [owner, beneficiary, random] = await ethers.getSigners();
    
        // Deploy our own entry point here
        const EntryPoint = await ethers.getContractFactory("EntryPoint");
        const entryPoint = await EntryPoint.deploy();
    
        // Do we need paymaster in our implementation ??
        const VerifyingPaymaster = await ethers.getContractFactory(
          "VerifyingPaymaster"
        );
        const verifyingPaymaster = await VerifyingPaymaster.deploy(
          entryPoint.address,
          owner.address
        );
    
        await entryPoint.depositTo(verifyingPaymaster.address, {
          value: parseEther("2"),
        });
    
        // Create wallet here (update later to use our factory)
        const OpenfortWallet = await ethers.getContractFactory(
          "OpenfortWallet"
        );
        const openfortWallet = await OpenfortWallet.deploy();
    
        // Do setup on wallet 
        await openfortWallet.connect(owner).setupWithEntryPoint(
            [owner.address],
            1,
            random.address,
            0x0,
            random.address,
            random.address,
            0,
            random.address,
            entr.address
        );
    
        return {
          owner,
          beneficiary,
          random,
          openfortWallet,
          entryPoint,
        };
      }
      
  
  it("Create and validate UserOperation", async function () {
    const { owner1,
    beneficiary1,
    random1,
    openfortWallet1,
    entryPoint1,
  } = loadFixture(deployAndSetupSafeWallet)

    // Create wallet here (update later to use our factory)
    const OpenfortWallet = await ethers.getContractFactory(
    "OpenfortWallet"
    );
    const openfortWallet = await OpenfortWallet.deploy();

    const [owner, recipient, beneficiary, random, entryPoint, testAccount] = await ethers.getSigners();

    // Setup safe wallet 
    await openfortWallet.setupWalletAndEntryPoint(
        [owner.address],
        1,
        random.address,
        0x0,
        random.address,
        random.address,
        0,
        random.address,
        entryPoint.address
    );

    expect(await openfortWallet.entryPoint()).to.equal(entryPoint.address);
    expect(await openfortWallet.nonce()).to.equal(1);

    /* 
    We need to: 
        1. create the UserOp, get signature of it somehow
        2. get it's hash
        3. call validateUserOp to verify it is correct.
    */

    // Default user op struct 
    // Need to get signature here somehow 
    const userOperation0 = {
        'sender' : owner.address,
        'nonce' : 1,
        'initcode' : "0x",
        'calldata' : "0x",
        'callGasLimit' : 0,
        'verificationGasLimit' : 100000,
        'preVerificationGas' : 21000,
        'maxFeePerGas' : 0,
        'maxPriorityFeePerGas' : 1e9,
        'paymasterAndData' : "0x",
        'signature' : "0x"
    };

    //tenderly
    //{"sender":"0xa8430797A27A652C03C46D5939a8e7698491BEd6","nonce":1,"initcode":"0x","calldata":"0x","callGasLimit":0,"verificationGasLimit":100000,"preVerificationGas":21000,"maxFeePerGas":0,"maxPriorityFeePerGas":1e9,"paymasterAndData":"0x","signature":"0x"}

    // Need to get correct signature
    const userOp = [
        owner.address,
        1,
        "0x",
        "0x",
        0,
        100000,
        21000,
        0,
        1e9,
        "0x",
        "0x993dab3dd91f5c6dc28e17439be475478f5635c92a56e17e82349d3fb2f166196f466c0b4e0c146f285204f0dcb13e5ae67bc33f4b888ec32dfe0a063e8f3f781b"];

    ///////

    provider = new ethers.providers.JsonRpcProvider("https://eth-goerli.g.alchemy.com/v2/dYfnm53DsDD80Wmr3foRg5j8Y09i1XRv");
    //provider = ethers.getDefaultProvider();
    //const y = await provider2.getBalance(openfortWallet);
    //console.log(y);

    const walletAPI = new SimpleAccountAPI({
        provider, 
        entryPoint,
        owner,
        openfortWallet
    })
    
    const op = await walletAPI.createSignedUserOp({
      target: recipient.address,
      data: recipient.interface.encodeFunctionData('something', ['hello'])
    })

    // need to fix chainId bit
    const chainId = 31337;
    const userOpHash = keccak256(op);
    const enc = defaultAbiCoder.encode(
        ["bytes32", "address", "uint256"],
        [userOpHash, entryPoint.address, chainId]
    );

    userOperationHash = keccak256(enc);
    
    const x = await openfortWallet.connect(entryPoint).validateUserOp(
        op, userOperationHash, 0
    );

    console.log(entryPoint.address);
    console.log(x);

    expect(await openfortWallet.connect(entryPoint).validateUserOp(
        userOperation, userOperationHash, 0 
    )).to.equal(0);

    ///////

    /*
    // Need to work out what's going on here 
    const { data } = await testAccount.transfer(
        owner.address,
        parseEther("2.0")
        );

    const txExec = await baseAccountContract.populateTransaction.execute(
        testAccount.address,
        0,
        data
      );

    // Creating userop
    let op = await fillAndSign(
        {
          sender: openfortWallet.address,
          nonce: await openfortWallet.nonce(),
          callData: txExec.data,
        },
        owner,
        entryPoint
      );
*/

  });

});