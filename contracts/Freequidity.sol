// SPDX-License-Identifier: MIT
pragma solidity 0.8.31;

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

    modifier nonReentrant() {
        require(!locked, "Reentrant call.");
        locked = true;
        _;
        locked = false;
    }

    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    address public constant WCRO = 0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23; // Wrapped CRO on Cronos

    uint256 public minCroAmount = 1 ether; // Minimum amount of CRO to process
    uint256 public maxCroAmount = 100 ether; // Maximum amount of CRO to process
    uint256 public slippageTolerance = 300; // 3% slippage tolerance (in basis points)
    uint256 private constant SLIPPAGE_BASE = 10000;
    uint256 private constant DEADLINE_OFFSET = 600; // 10 minutes
    uint256 private constant LIQUIDITY_MULTIPLIER = 2;
    bool public paused = false;

    // Store the TP token and router addresses as state variables
    address public TP_TOKEN;
    address public EBISUS_BAY_ROUTER;

    event LiquidityBurned(address indexed user, uint256 croAmount, uint256 tpAmount, uint256 liquidityBurned);
    event TreasuryWithdrawn(address indexed token, uint256 amount);

    modifier notPaused() {
        require(!paused, "Contract is paused.");
        _;
    }

    // Constructor sets the TP token and router addresses
    constructor(address _owner, address _tpToken, address _router) Ownable(_owner) {
        require(_tpToken != address(0), "Invalid TP token.");
        require(_router != address(0), "Invalid router.");
        TP_TOKEN = _tpToken;
        EBISUS_BAY_ROUTER = _router;
    }

    receive() external payable {
        burnLiquidityPayReward();
    }

    function burnLiquidityPayReward() public payable notPaused nonReentrant {
        uint256 croAmount = msg.value;
        require(croAmount >= minCroAmount, "CRO amount too small.");
        require(croAmount <= maxCroAmount, "CRO amount too large.");

        // Calculate how much TP is needed based on the CRO amount
        uint256 tpAmount = calculateTPAmount(croAmount);
        uint256 reqAmount = tpAmount * LIQUIDITY_MULTIPLIER; // Half burned, half to user
        uint256 contractTPBalance = IERC20(TP_TOKEN).balanceOf(address(this));

        // Check if we have enough TP in the contract.
        require(
            contractTPBalance >= reqAmount,
            string.concat(
                "Insufficient TP remaining. ",
                "Required: ", uint2str(reqAmount),
                ", Available: ", uint2str(contractTPBalance)
            )
        );

        // Approve router to use TP tokens
        // Reset approval to 0 first, then set new approval
        IERC20(TP_TOKEN).safeIncreaseAllowance(EBISUS_BAY_ROUTER, 0);
        IERC20(TP_TOKEN).safeIncreaseAllowance(EBISUS_BAY_ROUTER, tpAmount);

        // Calculate minimum amounts based on slippage tolerance
        uint256 minTPAmount = tpAmount * (SLIPPAGE_BASE - slippageTolerance)/(SLIPPAGE_BASE);
        uint256 minCROAmount = croAmount * (SLIPPAGE_BASE - slippageTolerance)/(SLIPPAGE_BASE);

        // Add liquidity and burn LP tokens by sending them to dead address
        (uint256 usedTPAmount, uint256 usedCROAmount, uint256 liquidity) = IEbisusBayRouter(EBISUS_BAY_ROUTER).addLiquidityETH{
            value: croAmount
        }(
            TP_TOKEN,
            tpAmount,
            minTPAmount,
            minCROAmount,
            DEAD_ADDRESS,
            block.timestamp + DEADLINE_OFFSET
        );

        // Send equivalent TP to the user
        IERC20(TP_TOKEN).safeTransfer(msg.sender, usedTPAmount);
        emit LiquidityBurned(msg.sender, usedCROAmount, usedTPAmount, liquidity);
    }

    // Helper function to convert uint to string
    function uint2str(uint256 number) internal pure returns (string memory) {
        if (number == 0) {
            return "0";
        }

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

    function calculateTPAmount(uint256 croAmount) internal view returns (uint256) {
        // Get the current exchange rate from the router
        address[] memory path = new address[](2);
        path[0] = WCRO; // WCRO on Cronos
        path[1] = TP_TOKEN;

        uint256[] memory amounts = IEbisusBayRouter(EBISUS_BAY_ROUTER).getAmountsOut(croAmount, path);
        return amounts[1];
    }

    // Admin functions
    /**
    * @notice Sets the minimum and maximum CRO amounts for transactions
    * @dev Only callable by the contract owner. Ensures minAmount < maxAmount.
    * @param _minAmount The minimum CRO amount required per transaction
    * @param _maxAmount The maximum CRO amount allowed per transaction
    */
    function setMinMaxCroAmount(uint256 _minAmount, uint256 _maxAmount) external onlyOwner {
        require(_minAmount < _maxAmount, "Min must be less than max");
        minCroAmount = _minAmount;
        maxCroAmount = _maxAmount;
    }

    /**
     * @notice Sets the slippage tolerance for liquidity operations
     * @dev Only callable by the contract owner. Slippage is specified in basis points (1% = 100).
     *      Maximum allowed slippage is 10% (1000 basis points).
     * @param _slippageTolerance The slippage tolerance in basis points
     */
    function setSlippageTolerance(uint256 _slippageTolerance) external onlyOwner {
        require(_slippageTolerance <= 1000, "Slippage tolerance too high"); // Max 10%
        slippageTolerance = _slippageTolerance;
    }

    /**
     * @notice Pauses or unpauses the contract
     * @dev Only callable by the contract owner. When paused, most user-facing functions will revert.
     * @param _paused Boolean value to set the pause state (true = paused, false = unpaused)
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    /**
     * @notice Withdraws tokens or ETH from the contract treasury
     * @dev Only callable by the contract owner. Emits TreasuryWithdrawn event.
     * @param token The address of the token to withdraw (address(0) for ETH)
     * @param amount The amount of tokens or ETH to withdraw
     */
    function withdrawTreasury(address token, uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Cannot withdraw zero");

        if (token == address(0)) {
            // For ETH withdrawal, use call with explicit gas stipend check
            (bool success, ) = owner().call{value: amount}("");
            require(success, "Transfer failed");
        } else {
            // For ERC20 tokens, continue using safeTransfer
            IERC20(token).safeTransfer(owner(), amount);
        }
        emit TreasuryWithdrawn(token, amount);
    }
}