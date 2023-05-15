// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

library Roles {
    bytes32 public constant ADD_DEPARTURE = keccak256("ADD_DEPARTURE");
    bytes32 public constant ADD_ARRIVAL = keccak256("ADD_ARRIVAL");
    bytes32 public constant CLAIM_ON_VAULT = keccak256("CLAIM_ON_VAULT");
}
