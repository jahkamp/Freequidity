// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./MockERC20.sol";
import "./MockFactory.sol";

contract MockRouter {
    MockFactory public factory;
    address public immutable WETH_ADDR;
    mapping(address => uint256) public priceOut; // token -> amount per 1 ether

    constructor(address _factory, string memory /*tpSymbol*/) {
        factory = MockFactory(_factory);
        // deploy a mock WETH token
        MockERC20 weth = new MockERC20("Wrapped CRO", "WCRO", 0);
        WETH_ADDR = address(weth);
    }

    function WETH() external view returns (address) {
        return WETH_ADDR;
    }

    function factoryAddress() external view returns (address) {
        return address(factory);
    }

    function setPriceOut(address token, uint256 amountOut) external {
        priceOut[token] = amountOut;
    }

    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts) {
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        for (uint i = 1; i < path.length; i++) {
            // simplistic: return amountIn * priceOut[path[i]] / 1 ether
            amounts[i] = (amountIn * priceOut[path[i]]) / (1 ether);
        }
        return amounts;
    }

    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint,
        uint,
        address to,
        uint
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity) {
        // deploy a mock pair token to represent LP if none exists
        address pair = factory.getPair(WETH_ADDR, token);
        if (pair == address(0)) {
            MockERC20 lp = new MockERC20("LP TOKEN", "LP", 0);
            // set pair in factory
            factory.setPair(WETH_ADDR, token, address(lp));
            pair = address(lp);
        }

        // mint LP to this contract by calling mint on MockERC20
        MockERC20(pair).mint(address(this), 1e18);

        // send LP to 'to'
        MockERC20(pair).transfer(to, 1e18);

        return (amountTokenDesired, msg.value, 1e18);
    }
}
