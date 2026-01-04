// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IEbisusBayRouter {
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);

    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
}

contract Freequidity is Ownable {
    using SafeERC20 for IERC20;

    // Reentrancy guard state
    bool private locked;

    // Explicitly marked as internal
    modifier nonReentrant() internal {
        require(!locked, "Freequidity: reentrant call");
        locked = true;
        _;
        locked = false;
    }

    // Constants
    uint256 private constant SLIPPAGE_BASE = 10_000;
    uint256 private constant DEADLINE_OFFSET = 600; // 10 minutes
    uint256 private constant LIQUIDITY_MULTIPLIER = 2;
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    address public constant WCRO = 0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23;

    address public TP_TOKEN;
    address public EBISUS_BAY_ROUTER;
    uint256 public minCroAmount = 1 ether;
    uint256 public maxCroAmount = 100 ether;
    uint256 public slippageTolerance = 300; // 3% slippage tolerance
    bool public paused = false;

    event LiquidityBurned(address indexed user, uint256 croAmount, uint256 tpAmount, uint256 liquidityBurned);
    event TreasuryWithdrawn(address indexed token, uint256 amount);

    constructor(address _owner, address _tpToken, address _router) Ownable(_owner) {
        require(_tpToken != address(0), "Freequidity: invalid TP token");
        require(_router != address(0), "Freequidity: invalid router");

        TP_TOKEN = _tpToken;
        EBISUS_BAY_ROUTER = _router;
    }

    modifier notPaused() internal {
        require(!paused, "Freequidity: contract paused");
        _;
    }

    receive() external payable {
        executeFreequidity();
    }

    function executeFreequidity() public payable notPaused nonReentrant {
        uint256 croAmount = msg.value;
        require(croAmount >= minCroAmount, "Freequidity: CRO below minimum");
        require(croAmount <= maxCroAmount, "Freequidity: CRO above maximum");

        uint256 tpAmount = calculateTPAmount(croAmount);
        uint256 reqAmount = tpAmount * LIQUIDITY_MULTIPLIER;

        require(
            IERC20(TP_TOKEN).balanceOf(address(this)) >= reqAmount,
            string(abi.encodePacked(
                "Freequidity: Insufficient TP. Required: ",
                uint2str(reqAmount),
                ", Available: ",
                uint2str(IERC20(TP_TOKEN).balanceOf(address(this)))
            ))
        );

        // Reset approval to 0 first, then set new approval
        IERC20(TP_TOKEN).safeApprove(EBISUS_BAY_ROUTER, 0);
        IERC20(TP_TOKEN).safeIncreaseAllowance(EBISUS_BAY_ROUTER, tpAmount);

        uint256 minTPAmount = tpAmount * (SLIPPAGE_BASE - slippageTolerance) / SLIPPAGE_BASE;
        uint256 minCROAmount = croAmount * (SLIPPAGE_BASE - slippageTolerance) / SLIPPAGE_BASE;

        (uint256 usedTPAmount, uint256 usedCROAmount, uint256 liquidity) = IEbisusBayRouter(EBISUS_BAY_ROUTER).addLiquidityETH{value: croAmount}(
            TP_TOKEN,
            tpAmount,
            minTPAmount,
            minCROAmount,
            DEAD_ADDRESS,
            block.timestamp + DEADLINE_OFFSET
        );

        IERC20(TP_TOKEN).safeTransfer(msg.sender, usedTPAmount);
        emit LiquidityBurned(msg.sender, usedCROAmount, usedTPAmount, liquidity);
    }

    function calculateTPAmount(uint256 croAmount) public view returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = WCRO;
        path[1] = TP_TOKEN;
        return IEbisusBayRouter(EBISUS_BAY_ROUTER).getAmountsOut(croAmount, path)[1];
    }

    function withdrawTreasury(address token, uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Freequidity: cannot withdraw zero");

        if (token == address(0)) {
            (bool success, ) = owner().call{value: amount}("");
            require(success, "Freequidity: ETH transfer failed");
        } else {
            IERC20(token).safeTransfer(owner(), amount);
        }
        emit TreasuryWithdrawn(token, amount);
    }

    // Admin functions with explicit visibility
    function setMinMaxCroAmount(uint256 _minAmount, uint256 _maxAmount) external onlyOwner {
        require(_minAmount < _maxAmount, "Freequidity: min >= max");
        minCroAmount = _minAmount;
        maxCroAmount = _maxAmount;
    }

    function setSlippageTolerance(uint256 _slippageTolerance) external onlyOwner {
        require(_slippageTolerance <= 1000, "Freequidity: slippage too high");
        slippageTolerance = _slippageTolerance;
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    function uint2str(uint256 number) internal pure returns (string memory) {
        if (number == 0) return "0";

        uint256 temp = number;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }

        bytes memory buffer = new bytes(digits);
        temp = number;
        for (uint256 i = digits; i > 0; i--) {
            buffer[i-1] = bytes1(uint8(48 + temp % 10));
            temp /= 10;
        }

        return string(buffer);
    }
}