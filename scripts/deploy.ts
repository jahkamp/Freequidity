const hre = require("hardhat");

async function main() {
  console.log("Deploying Freequidity...");
  
  // Token and router can be overridden with environment variables for different networks
  // Default TP token set to TTP (Cronos testnet) for convenient testing
  const TP_TOKEN = process.env.TP_TOKEN || "0xacf7fF592997a4Ca3e1d109036eAAe2603c1D948"; // default (Cronos testnet TTP)
  const ROUTER = process.env.ROUTER || "0x4A1c18A37706AC24f8183C1F83b7F672B59CE6c7"; // default (Cronos router)
  console.log(`Using TP_TOKEN=${TP_TOKEN} ROUTER=${ROUTER} on network ${hre.network.name}`);

  const Freequidity = await hre.ethers.getContractFactory("Freequidity");
  const contract = await Freequidity.deploy(TP_TOKEN, ROUTER);
  await contract.deployed();
  
  console.log("Freequidity deployed to:", contract.address);
  
  // Save the address to a file for frontend use
  const fs = require("fs");
  const addressPath = "./deployed-address.json";
  fs.writeFileSync(addressPath, JSON.stringify({
    Freequidity: contract.address,
    TP_TOKEN,
    ROUTER,
    network: hre.network.name,
    deployer: (await hre.ethers.getSigners())[0].address,
  }, null, 2));
  
  console.log(`Deployment info saved to ${addressPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });