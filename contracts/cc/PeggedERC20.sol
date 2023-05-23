// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../TokenNameSymbol.sol";
import "./IMintable.sol";

contract PeggedERC20 is ERC20, TokenNameSymbol, ERC20Burnable, Ownable, IMintable {
    constructor() ERC20("", "") TokenNameSymbol("", "") {}

    function initialize(string memory name_, string memory symbol_) public {
        require(owner() == address(0), "initialized");
        _name = name_; _symbol = symbol_;
        _transferOwnership(msg.sender);
    }

    function mint(address to, uint[] memory, uint[] memory amounts) public onlyOwner {
        for(uint i=0; i<amounts.length;i++) {
            _mint(to, amounts[i]);
        }
    }

    function safeMint(address to, uint256 amount)
    public
    onlyOwner
    {
        _mint(to, amount);
    }

    // The following functions are overrides required by Solidity.
    function _beforeTokenTransfer(address from, address to, uint amount)
    internal
    override(ERC20)
    {
        super._beforeTokenTransfer(from, to, amount);
    }

    function name() public view override(ERC20, TokenNameSymbol) returns (string memory) {
        return _name;
    }

    function symbol() public view override(ERC20, TokenNameSymbol) returns (string memory) {
        return _symbol;
    }
}