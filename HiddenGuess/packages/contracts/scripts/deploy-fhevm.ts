import { ethers } from "hardhat";

async function main() {
  console.log("Deploying HiddenGuess contract to FHEVM Hardhat node...");

  // Get the contract factory
  const HiddenGuess = await ethers.getContractFactory("HiddenGuess");

  // Deploy the contract
  const hiddenGuess = await HiddenGuess.deploy();

  // Wait for deployment to complete
  await hiddenGuess.waitForDeployment();

  const address = await hiddenGuess.getAddress();
  console.log(`HiddenGuess deployed to: ${address}`);

  // Save deployment info
  const deploymentInfo = {
    contractName: "HiddenGuess",
    address: address,
    chainId: 31337,
    network: "localhost",
    deployedAt: new Date().toISOString(),
  };

  console.log("Deployment completed successfully!");
  console.log("Contract address:", address);
  console.log("Network: localhost (FHEVM Hardhat)");
  console.log("Chain ID: 31337");
  
  return deploymentInfo;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
