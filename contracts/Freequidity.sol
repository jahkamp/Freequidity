// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/// @notice Minimal IERC20 interface
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

/// @notice Minimal UniswapV2 Router interface (addLiquidityETH + price query)
interface IUniswapV2Router02 {
    function WETH() external pure returns (address);
    function factory() external pure returns (address);
    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts);
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
}

/// @notice Minimal UniswapV2 Factory interface (to find pair address)
interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

/// @title Freequidity
/// @notice Accepts CRO from users, transfers TP from contract's TP balance to the user at current on-chain price, uses the received CRO to add WCRO/TP liquidity on a UniswapV2-style router, and burns the LP tokens.
contract Freequidity {
    // ---- state ----
    IERC20 public immutable TP;
    IUniswapV2Router02 public immutable router;
    address public immutable DEAD = 0x000000000000000000000000000000000000dEaD;

    // minimal ownership
    address public owner;

    // reentrancy guard
    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    // Reserve controls: require the contract hold roughly reserveMultiplier% of expected TP (100 = 1x, 200 = 2x)
    // and an optional small buffer in basis points to account for rounding/slippage
    uint256 public reserveMultiplierPct = 200; // default 200% => ~2x
    uint256 public reserveBufferBips = 100; // default 1% extra

    // events
    event SwapPaidWithTP(address indexed buyer, uint256 croIn, uint256 tpOut);
    event LiquidityAddedAndBurned(address indexed pair, uint256 amountToken, uint256 amountETH, uint256 liquidity);
    event OwnerWithdrawn(address token, address to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "REENTRANT");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    constructor(address _tp, address _router) {
        require(_tp != address(0) && _router != address(0), "ZERO_ADDRESS");
        TP = IERC20(_tp);
        router = IUniswapV2Router02(_router);
        owner = msg.sender;
        _status = _NOT_ENTERED;
    }

    receive() external payable {}

    /// @notice Query the current expected TP output for a given CRO (wei) amount using the router's reserves
    /// @param croAmount amount of native CRO (in wei)
    /// @return tpAmount expected TP amount returned by the router path [WETH, TP]
    function quoteTPForCRO(uint256 croAmount) public view returns (uint256 tpAmount) {
        require(croAmount > 0, "ZERO_CRO");
        address[] memory path = new address[](2);
        path[0] = router.WETH();
        path[1] = address(TP);
        uint256[] memory amounts = router.getAmountsOut(croAmount, path);
        return amounts[amounts.length - 1];
    }

    /// @notice Main function: user sends CRO, receives TP (from this contract's TP balance) at on-chain price; the contract uses the CRO to add WCRO/TP liquidity on the router and burns the LP tokens.
    /// @param slippageBips allowed slippage in basis points (parts per 10,000) used to set min amounts for adding liquidity (e.g., 100 = 1%)
    /// @param deadline unix timestamp deadline for the router call
    function swapCROForTPAndBurnLP(uint256 slippageBips, uint256 deadline) external payable nonReentrant returns (uint256, uint256) {
        require(msg.value > 0, "NO_CRO_SENT");
        require(slippageBips <= 1000, "SLIPPAGE_TOO_HIGH"); // max 10%

        uint256 expectedTP = quoteTPForCRO(msg.value);
        require(expectedTP > 0, "NO_PAIR_OR_ZERO_OUTPUT");

    // compute required TP reserve: reserveMultiplierPct percent of expectedTP, plus buffer (bips)
    // required = expectedTP * reserveMultiplierPct / 100  + expectedTP * reserveBufferBips / 10000
    uint256 totalTPNeeded = (expectedTP * reserveMultiplierPct) / 100 + (expectedTP * reserveBufferBips) / 10000;
    require(TP.balanceOf(address(this)) >= totalTPNeeded, "INSUFFICIENT_TP_IN_CONTRACT");

        // transfer TP to user
        require(TP.transfer(msg.sender, expectedTP), "TP_TRANSFER_TO_USER_FAILED");
        emit SwapPaidWithTP(msg.sender, msg.value, expectedTP);

        // approve router to pull TP for liquidity
        require(TP.approve(address(router), expectedTP), "APPROVE_FAILED");

        uint256 minToken = (expectedTP * (10000 - slippageBips)) / 10000;
        uint256 minETH = (msg.value * (10000 - slippageBips)) / 10000;

        // add liquidity and burn LP (separate internal call to reduce stack usage)
        (uint256 liquidity, uint256 lpBurned) = _addLiquidityAndBurn(expectedTP, msg.value, minToken, minETH, deadline);
        return (expectedTP, lpBurned);
    }

    // internal helper to add liquidity and burn LP tokens; split out to reduce stack depth in main flow
    function _addLiquidityAndBurn(uint256 tokenAmount, uint256 ethAmount, uint256 minToken, uint256 minETH, uint256 deadline) internal returns (uint256 liquidity, uint256 lpBurned) {
        ( , , liquidity) = router.addLiquidityETH{value: ethAmount}(
            address(TP),
            tokenAmount,
            minToken,
            minETH,
            address(this),
            deadline
        );

        address pair = IUniswapV2Factory(router.factory()).getPair(router.WETH(), address(TP));
        if (pair != address(0)) {
            IERC20 lp = IERC20(pair);
            uint256 lpBal = lp.balanceOf(address(this));
            if (lpBal > 0) {
                require(lp.transfer(DEAD, lpBal), "LP_BURN_FAILED");
                lpBurned = lpBal;
            }
            emit LiquidityAddedAndBurned(pair, tokenAmount, ethAmount, liquidity);
        } else {
            emit LiquidityAddedAndBurned(address(0), tokenAmount, ethAmount, liquidity);
        }
    }

    /// @notice Owner can adjust reserve multiplier (percentage). 100 = 1x, 200 = 2x.
    function setReserveMultiplierPct(uint256 pct) external onlyOwner {
        require(pct >= 100 && pct <= 1000, "pct-out-of-range");
        reserveMultiplierPct = pct;
    }

    /// @notice Owner can adjust buffer in basis points (parts per 10,000). Default 100 = 1%.
    function setReserveBufferBips(uint256 bips) external onlyOwner {
        require(bips <= 1000, "buffer-too-large"); // max 10%
        reserveBufferBips = bips;
    }

    /// @notice Owner rescue: withdraw tokens (including TP or accidentally sent tokens) or native CRO from contract
    function ownerWithdrawToken(address token, address to, uint256 amount) external onlyOwner {
        require(to != address(0), "ZERO_TO");
        if (token == address(0)) {
            // native CRO
            payable(to).transfer(amount);
        } else {
            IERC20(token).transfer(to, amount);
        }
        emit OwnerWithdrawn(token, to, amount);
    }

    /// @notice Change owner
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_ADDRESS");
        owner = newOwner;
    }
}
