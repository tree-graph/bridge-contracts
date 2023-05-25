// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "./PeggedERC721.sol";
import "./PeggedERC20.sol";
import "./PeggedERC1155.sol";

contract TokenFactory is Ownable {
    address beacon20;
    address beacon721;
    address beacon1155;
    event ERC20_CREATED(address indexed artifact, address indexed creator);
    event ERC721_CREATED(address indexed artifact, address indexed creator);
    event ERC1155_CREATED(address indexed artifact, address indexed creator);

    constructor() {
    }
    function initialize(address beacon20_, address beacon721_, address beacon1155_) public {
        require(owner() == address(0), "initialized");
        beacon20 = beacon20_;
        beacon721 = beacon721_;
        beacon1155 = beacon1155_;
        _transferOwnership(msg.sender);
    }

    function deployERC1155(string memory name_, string memory symbol_, string memory uri_) public returns(PeggedERC1155) {
        PeggedERC1155 erc1155 = PeggedERC1155(address(new BeaconProxy(beacon1155, "")));
        erc1155.initialize(name_, symbol_, uri_);
        erc1155.transferOwnership(msg.sender);
        emit ERC1155_CREATED(address(erc1155), msg.sender);
        return erc1155;
    }

    function deployERC721(string memory name_, string memory symbol_, string memory uri_) public returns(PeggedERC721) {
        PeggedERC721 erc721 = PeggedERC721(address(new BeaconProxy(beacon721, "")));
        erc721.initialize(name_, symbol_, uri_);
        erc721.transferOwnership(msg.sender);
        emit ERC721_CREATED(address(erc721), msg.sender);
        return erc721;
    }

    function deployERC20(string memory name_, string memory symbol_) public returns(PeggedERC20) {
        PeggedERC20 newToken = PeggedERC20(address(new BeaconProxy(beacon20, "")));
        newToken.initialize(name_, symbol_);
        newToken.transferOwnership(msg.sender);
        emit ERC20_CREATED(address(newToken), msg.sender);
        return newToken;
    }
}
