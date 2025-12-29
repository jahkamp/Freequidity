const hre = require('hardhat');

async function main() {
  console.log('Deploying local mocks and Freequidity...');
  const [deployer] = await hre.ethers.getSigners();

  // Deploy MockERC20 (TP)
  const ERC20 = await hre.ethers.getContractFactory('MockERC20');
  const tp = await ERC20.deploy('Test TP', 'TP', hre.ethers.utils.parseEther('1000000'));
  await tp.deployed();
  console.log('TP token deployed to:', tp.address);

  // Deploy MockFactory
  const Factory = await hre.ethers.getContractFactory('MockFactory');
  const factory = await Factory.deploy();
  await factory.deployed();
  console.log('Factory deployed to:', factory.address);

  // Deploy MockRouter
  const Router = await hre.ethers.getContractFactory('MockRouter');
  const router = await Router.deploy(factory.address, await tp.symbol());
  await router.deployed();
  console.log('Router deployed to:', router.address);

  // Deploy Freequidity
  const Freequidity = await hre.ethers.getContractFactory('Freequidity');
  const fq = await Freequidity.deploy(tp.address, router.address);
  await fq.deployed();
  console.log('Freequidity deployed to:', fq.address);

  // Fund Freequidity with TP
  await tp.transfer(fq.address, hre.ethers.utils.parseEther('10000'));
  console.log('Funded Freequidity with TP');

  // set price 1 ETH -> 100 TP
  await router.setPriceOut(tp.address, hre.ethers.utils.parseEther('100'));
  console.log('Set router priceOut for TP to 100 per ETH');

  // save deployed addresses
  const fs = require('fs');
  const addressPath = './deployed-address.json';
  fs.writeFileSync(addressPath, JSON.stringify({
    Freequidity: fq.address,
    TP: tp.address,
    Router: router.address,
    Factory: factory.address,
    network: hre.network.name,
    deployer: deployer.address,
  }, null, 2));
  console.log(`Deployment info saved to ${addressPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});