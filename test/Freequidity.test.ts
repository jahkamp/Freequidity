import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;

describe("Freequidity (integration with mocks)", function () {
  it("should swap CRO for TP and burn LP using mock router", async function () {
    const [deployer, buyer] = await ethers.getSigners();

    // Deploy a mock ERC20 as TP
    const ERC20 = await ethers.getContractFactory("MockERC20");
    const tp = await ERC20.deploy("Test TP", "TP", ethers.utils.parseEther("1000000"));
    await tp.deployed();

    // Deploy mock router and factory + pair
    const Factory = await ethers.getContractFactory("MockFactory");
    const factory = await Factory.deploy();
    await factory.deployed();

    const Router = await ethers.getContractFactory("MockRouter");
    const router = await Router.deploy(factory.address, await tp.symbol());
    await router.deployed();

  // set a simple price: 1 CRO -> 100 TP (priceOut expects amount per 1 ether)
  await router.setPriceOut(tp.address, ethers.utils.parseEther("100"));

    // Deploy the Freequidity contract
    const Freequidity = await ethers.getContractFactory("Freequidity");
    const tpCro = await Freequidity.deploy(tp.address, router.address);
    await tpCro.deployed();

    // Fund the contract with TP so it can pay users and provide liquidity
    await tp.transfer(tpCro.address, ethers.utils.parseEther("10000"));

    // buyer calls swap with 1 CRO (1 ether in tests)
    const beforeBuyerTP = await tp.balanceOf(buyer.address);
    await tpCro.connect(buyer).swapCROForTPAndBurnLP(100, Math.floor(Date.now() / 1000) + 60, { value: ethers.utils.parseEther("1") });
  const afterBuyerTP = await tp.balanceOf(buyer.address);
  expect(afterBuyerTP.gt(beforeBuyerTP)).to.be.true;

    // LP tokens should have been burned (mock router will credit pair then we check pair balance of TPCro and dead address)
    const pairAddr = await factory.getPair(await router.WETH(), tp.address);
    const LP = await ethers.getContractAt("MockERC20", pairAddr);
    const dead = "0x000000000000000000000000000000000000dEaD";
  const deadBal = await LP.balanceOf(dead);
  expect(deadBal.gt(0)).to.be.true;
  });
});
