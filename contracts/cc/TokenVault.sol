// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./Router.sol";
import "./IMintable.sol";
import "./PeggedERC721.sol";
import "./PeggedERC1155.sol";
import "./RouteReader.sol";

contract TokenVault is IERC721Receiver, IERC1155Receiver, RouteReader {
    bool initialized;
    // user=>(sourceChain=>nonce)
    mapping(address=>mapping(uint=>uint)) userClaimNonce;
    // user=>(targetChain=>nonce)
    mapping(address=>mapping(uint=>uint)) userNonce;

    bool private enableReceiverHook;
    event CrossRequest(address indexed asset,
        address indexed from,
        uint[] tokenIds,
        uint[] amounts, // 721全传1
        string[] uris,
        uint toChainId,
        address targetContract, uint userNonce
    );

    constructor() {
        initialized = true;
    }

    function initialize() public {
        require(initialized == false, "initialized");
        initialized = true;
        enableReceiverHook = true;
        _grantRole(Roles.ADD_DEPARTURE, msg.sender);
        _grantRole(Roles.ADD_ARRIVAL, msg.sender);
        _grantRole(Roles.CLAIM_ON_VAULT, msg.sender);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function claim(bytes calldata/* receipt*/) public pure {
//        (   uint srcChainId, address srcContract,
//        uint[] memory tokenIds, uint[] memory amounts,
//        address issuer, uint userNonce_
//        ) = abi.decode(receipt, (uint,address,uint[],uint[],address, uint));
        revert("not supported yet");
    }
    function getUserNextClaimNonce(address issuer, uint srcChainId) public view returns (uint) {
        return userClaimNonce[issuer][srcChainId] + 1;
    }
    function claimByAdmin(uint srcChainId, address srcContract, address localContract,
        uint[] memory tokenIds, uint[] memory amounts, string[] memory uris,
        address issuer, uint userNonce_) public onlyRole(Roles.CLAIM_ON_VAULT) {
        require(userNonce_ == userClaimNonce[issuer][srcChainId]+1, "bad user claim nonce");
        userClaimNonce[issuer][srcChainId] = userNonce_;

        require(tokenIds.length == amounts.length, "bad length");
        RouteConfig storage route = arrivalMap.map[srcContract].map[srcChainId];
        PeerInfo memory peer = route.peers[localContract];
        require(peer.timestamp > 0, "arrival config not found");
        require(peer.enable, "disabled");
        address fromThis = address(this);

        if (peer.op == OP.MINT) {
            IMintable(localContract).mint(issuer, tokenIds, amounts);
            if (peer.uriMode == URI_MODE.STORAGE) {
                if (peer.eip == EIP.EIP721) {
                    for(uint i=0; i<tokenIds.length; i++) {
                        PeggedERC721(localContract).setTokenURI(tokenIds[i], uris[i]);
                    }
                } else if (peer.eip == EIP.EIP1155) {
                    for(uint i=0; i<tokenIds.length; i++) {
                        PeggedERC1155(localContract).setURI(tokenIds[i], uris[i]);
                    }
                }
            }
        } else if (peer.eip == EIP.EIP1155) {
            IERC1155(localContract).safeBatchTransferFrom(fromThis, issuer, tokenIds, amounts, "");
        } else if (peer.eip == EIP.EIP20) {
            require(amounts.length==1, "invalid amounts for ERC20");
            IERC20(localContract).transfer(issuer, amounts[0]);
        } else {
            // 721 mint each
            for(uint i=0; i<tokenIds.length; i++) {
                IERC721(localContract).transferFrom(fromThis, issuer, tokenIds[i]);
            }
        }
    }

    function crossRequest(address localContract, address from, uint[] memory tokenIds, uint[] memory amounts, bytes memory data) internal {
        (uint targetChainId, address targetContract) = abi.decode(data, (uint, address));
        // check router
        PeerInfo memory info = departureMap.map[localContract].map[targetChainId].peers[targetContract];
        require(info.timestamp > 0, "router not found");
        string[] memory uris = new string[](tokenIds.length);
        for(uint i=0; i<tokenIds.length; i++) {
            if (info.uriMode == URI_MODE.STORAGE) {
                if (info.eip == EIP.EIP721) {
                    uris[i] = IERC721Metadata(localContract).tokenURI(tokenIds[i]);
                } else if (info.eip == EIP.EIP1155) {
                    uris[i] = IERC1155MetadataURI(localContract).uri(tokenIds[i]);
                }
            }
            if (info.op == OP.BURN20) {
                IERC20(localContract).transfer(address(0x00), amounts[i]);
            } else if (info.op == OP.BURN721){
                ERC721Burnable(localContract).burn(tokenIds[i]);
            } else if (info.op == OP.BURN1155){
                ERC1155Burnable(localContract).burnBatch(address(this), tokenIds, amounts);
                break;
            } else {
                break;
            }
        }
        uint userNonce_ = userNonce[from][targetChainId] + 1;
        userNonce[from][targetChainId] = userNonce_;
        emit CrossRequest(localContract, from, tokenIds, amounts, uris, targetChainId, targetContract, userNonce_);
    }

    function batchTransferFrom(uint toChainId, address targetContract,
        IERC721 assetContract,
        uint[] calldata tokenIds
    ) public {
        address addrThis = address(this);
        uint[] memory amounts = new uint[](tokenIds.length);
        enableReceiverHook = false;
        for(uint i=0; i<tokenIds.length; i++) {
            assetContract.transferFrom(msg.sender, addrThis, tokenIds[i]);
            amounts[i] = 1;
        }
        enableReceiverHook = true;
        crossRequest(address(assetContract), msg.sender, tokenIds, amounts, abi.encode(toChainId, targetContract));
    }

    function onERC721Received(
        address ,//operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) public override returns (bytes4) {
        if (enableReceiverHook) {
            uint[] memory tokenIds = new uint[](1);
            tokenIds[0] = tokenId;
            uint[] memory amounts = new uint[](1);
            amounts[0] = 1;
            crossRequest(msg.sender, from, tokenIds, amounts, data);
        }
        return this.onERC721Received.selector;
    }

    function onERC1155Received(
        address,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) public virtual override returns (bytes4) {
        uint[] memory tokenIds = new uint[](1);
        tokenIds[0] = id;
        uint[] memory amounts = new uint[](1);
        amounts[0] = value;
        crossRequest(msg.sender, from, tokenIds, amounts, data);
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) public virtual override returns (bytes4) {
        if (enableReceiverHook) {
            crossRequest(msg.sender, from, ids, values, data);
        }
        return this.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) public override(AccessControl, IERC165) view returns (bool) {
        return
            interfaceId == type(IERC721Receiver).interfaceId ||
            interfaceId == type(IERC1155Receiver).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
