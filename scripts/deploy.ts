import { ethers } from "hardhat";

async function main() {


  const OpenfortWalletFactory = await ethers.getContractFactory("OpenfortWalletFactory");
  const openfortWalletFactory = await OpenfortWalletFactory.deploy();

  await openfortWalletFactory.deployed();

  console.log(`Deployed to ${openfortWalletFactory.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
