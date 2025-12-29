"use strict";
const hre = require("hardhat");
async function main() {
    console.log("Deploying Freequidity...");
    // TODO: Update these addresses for your network
    const TP_TOKEN = "0xacf7fF592997a4Ca3e1d109036eAAe2603c1D948"; // Cronos testnet TTP
    const ROUTER = "0x4A1c18A37706AC24f8183C1F83b7F672B59CE6c7"; // Cronos mainnet Ebisusbay router
    const Freequidity = await hre.ethers.getContractFactory("Freequidity");
    const contract = await Freequidity.deploy(TP_TOKEN, ROUTER);
    await contract.deployed();
    console.log("Freequidity deployed to:", contract.address);
    // Save the address to a file for frontend use
    const fs = require("fs");
    const addressPath = "./deployed-address.json";
    fs.writeFileSync(addressPath, JSON.stringify({
        Freequidity: contract.address,
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
