// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155URIStorage.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../TokenNameSymbol.sol";
import "./IMintable.sol";

contract PeggedERC1155 is ERC1155, TokenNameSymbol, ERC1155URIStorage, ERC1155Burnable, Ownable, IMintable {
    constructor() ERC1155("") TokenNameSymbol("", "") {}

    function initialize(string memory name_, string memory symbol_, string memory uri_) public {
        require(owner() == address(0), "initialized");
        _name = name_; _symbol = symbol_;
        _setURI(uri_);
        _transferOwnership(msg.sender);
    }
    function setURI(uint256 tokenId, string memory _tokenURI) public onlyOwner {
        _setURI(tokenId, _tokenURI);
    }
    function setBaseURI(string memory uri_) public onlyOwner {
        _setBaseURI(uri_);
    }

    function mint(address to, uint[] memory tokenIds, uint[] memory amounts ) public onlyOwner {
        for(uint i=0; i<tokenIds.length;i++) {
            _mint(to, tokenIds[i], amounts[i], "");
        }
    }

    function safeMint(address to, uint256 tokenId, uint256 amount)
    public
    onlyOwner
    {
        _mint(to, tokenId, amount, "");
    }

    function uri(uint256 tokenId)
    public
    view
    override(ERC1155, ERC1155URIStorage)
    returns (string memory)
    {
        return super.uri(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC1155)
    returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function name() public view override(TokenNameSymbol) returns (string memory) {
        return _name;
    }

    function symbol() public view override(TokenNameSymbol) returns (string memory) {
        return _symbol;
    }
}