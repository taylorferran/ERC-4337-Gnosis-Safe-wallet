const { ethers } = require("hardhat");

async function main() {

  const OpenfortWallet = await ethers.getContractFactory("OpenfortWalletFactory");

  const deployedContract = OpenfortWallet.deploy();

  //await deployedContract.deployed();

  
  console.log(
    "Openfort wallet contract address: ",
    deployedContract.address
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
