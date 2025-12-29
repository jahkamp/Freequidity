// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MockFactory {
    mapping(bytes32 => address) public pairs;

    function setPair(address tokenA, address tokenB, address pair) external {
        pairs[keccak256(abi.encodePacked(tokenA, tokenB))] = pair;
        pairs[keccak256(abi.encodePacked(tokenB, tokenA))] = pair;
    }

    function getPair(address tokenA, address tokenB) external view returns (address) {
        return pairs[keccak256(abi.encodePacked(tokenA, tokenB))];
    }
}
