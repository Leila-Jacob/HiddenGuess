import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log(`Deploying contracts with the account: ${deployer.address}`);
  console.log(`Account balance: ${(await ethers.provider.getBalance(deployer.address)).toString()}`);

  // Deploy HiddenGuess contract
  const HiddenGuess = await ethers.getContractFactory("HiddenGuess");
  const hiddenGuess = await HiddenGuess.deploy();
  
  await hiddenGuess.waitForDeployment();
  
  const contractAddress = await hiddenGuess.getAddress();
  console.log(`HiddenGuess deployed to: ${contractAddress}`);
  
  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    address: contractAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };
  
  console.log("Deployment info:", JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



