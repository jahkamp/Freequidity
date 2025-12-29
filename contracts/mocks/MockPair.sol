// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./MockERC20.sol";

contract MockPair is MockERC20 {
    constructor() MockERC20("LP Token", "LP", 0) {}
}
