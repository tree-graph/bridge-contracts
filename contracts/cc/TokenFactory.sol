// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "./PeggedERC721.sol";

contract TokenFactory is Ownable {
    address beacon721;
    event ERC721_CREATED(address indexed artifact, address indexed creator);

    constructor(address beacon721_) {
        beacon721 = beacon721_;
    }
    function initialize(address beacon721_) public {
        require(owner() == address(0), "initialized");
        beacon721 = beacon721_;
        _transferOwnership(msg.sender);
    }
    function deployERC721(string memory name_, string memory symbol_, string memory uri_) public returns(PeggedERC721) {
        PeggedERC721 erc721 = PeggedERC721(address(new BeaconProxy(beacon721, "")));
        erc721.initialize(name_, symbol_, uri_);
        erc721.transferOwnership(msg.sender);
        emit ERC721_CREATED(address(erc721), msg.sender);
        return erc721;
    }
}
