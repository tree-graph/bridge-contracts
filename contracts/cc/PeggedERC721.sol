// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../TokenNameSymbol.sol";
import "./IMintable.sol";

contract PeggedERC721 is ERC721, TokenNameSymbol, ERC721Enumerable, ERC721URIStorage, ERC721Burnable, Ownable, IMintable {
    constructor() ERC721("", "") TokenNameSymbol("", "") {}
    string __baseURI;

    function initialize(string memory name_, string memory symbol_, string memory uri_) public {
        require(owner() == address(0), "initialized");
        _name = name_; _symbol = symbol_;
        __baseURI = uri_;
        _transferOwnership(msg.sender);
    }
    function setTokenURI(uint256 tokenId, string memory _tokenURI) public onlyOwner {
        _setTokenURI(tokenId, _tokenURI);
    }
    function setBaseURI(string memory uri_) public onlyOwner {
        __baseURI = uri_;
    }

    function mint(address to, uint[] memory tokenIds, uint[] memory ) public onlyOwner {
        for(uint i=0; i<tokenIds.length;i++) {
            _safeMint(to, tokenIds[i]);
        }
    }

    function safeMint(address to, uint256 tokenId, string memory uri)
    public
    onlyOwner
    {
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    // The following functions are overrides required by Solidity.

    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
    internal
    override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
    public
    view
    override(ERC721, ERC721URIStorage)
    returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC721, ERC721Enumerable)
    returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function name() public view override(ERC721, TokenNameSymbol) returns (string memory) {
        return _name;
    }

    function symbol() public view override(ERC721, TokenNameSymbol) returns (string memory) {
        return _symbol;
    }
    function _baseURI() internal view override returns (string memory) {
        return __baseURI;
    }
}