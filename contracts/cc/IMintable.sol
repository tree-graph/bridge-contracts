// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface IMintable {
    function mint(address to, uint[] memory tokenIds, uint[] memory amounts) external;
}
