const hre = require("hardhat");

async function main() {
  console.log("Deploying Freequidity...");
  
  // Token and router can be overridden with environment variables for different networks
  // Default TP token set to TTP (Cronos testnet) for convenient testing
  const TP_TOKEN = process.env.TP_TOKEN || "0xacf7fF592997a4Ca3e1d109036eAAe2603c1D948"; // default (Cronos testnet TTP)
  const ROUTER = process.env.ROUTER || "0x4A1c18A37706AC24f8183C1F83b7F672B59CE6c7"; // default (Ebisusbay router - Cronos)

  // --- Deploy-time safety checks ------------------------------------------------
  // - If on Cronos mainnet (chainId 25), require CONFIRM_MAINNET=true (or FORCE_MAINNET=true)
  // - Verify ROUTER has code and exposes WETH() to ensure correct interface
  const provider = hre.ethers.provider;
  const net = await provider.getNetwork();
  const chainId = net.chainId;
  const isCronosMainnet = chainId === 25;

  if (isCronosMainnet && !(process.env.CONFIRM_MAINNET === 'true' || process.env.FORCE_MAINNET === 'true')) {
    throw new Error(`Refusing to deploy to Cronos mainnet (chainId=${chainId}) without CONFIRM_MAINNET=true environment variable.`);
  }

  if (isCronosMainnet) {
    console.log('CONFIRM_MAINNET set — proceeding with Cronos mainnet deployment (chainId=25).');
  }

  const routerCode = await provider.getCode(ROUTER);
  if (routerCode === '0x') {
    throw new Error(`ROUTER ${ROUTER} has no contract code on network ${hre.network.name} (chainId ${chainId}). Set ROUTER to the correct mainnet address or switch networks.`);
  }

  try {
    const routerContract = await hre.ethers.getContractAt("IUniswapV2Router02", ROUTER);
    await routerContract.WETH(); // basic interface check
  } catch (err) {
    throw new Error(`ROUTER ${ROUTER} doesn't appear to implement expected router interface (WETH()); error: ${err && err.message ? err.message : err}`);
  }

  console.log(`Using TP_TOKEN=${TP_TOKEN} ROUTER=${ROUTER} on network ${hre.network.name} (chainId=${chainId})`);

  const Freequidity = await hre.ethers.getContractFactory("Freequidity");
  const contract = await Freequidity.deploy(TP_TOKEN, ROUTER);
  await contract.deployed();
  
  console.log("Freequidity deployed to:", contract.address);
  
  // Save the address to a file for frontend use
  const fs = require("fs");
  const addressPath = "./deployed-address.json";

  // Backup existing deploy file so we don't lose previous records (important for mainnet)
  if (fs.existsSync(addressPath)) {
    const backupPath = `${addressPath}.bak-${Date.now()}`;
    fs.copyFileSync(addressPath, backupPath);
    console.log(`Backed up existing ${addressPath} -> ${backupPath}`);
  }

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