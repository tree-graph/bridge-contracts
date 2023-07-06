// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "./Roles.sol";

/**
 * Config bridge route. Bi-direction route should be registered on each side.
 * Departure Router table:
 *       local contract =>
 *                          remote chainId =>
 *                                  remote contract => PeerInfo
 * Arrival Router table:
 *       remote contract =>
 *                          remote chainId =>
 *                                  local contract => PeerInfo
 */
contract Router is AccessControl {
    bytes4 constant ERC1155InterfaceId = 0xd9b67a26;
    bytes4 constant ERC721InterfaceId = 0x80ac58cd;

    // Local contract EIP
    enum EIP{NOT_SET, EIP20, EIP721, EIP1155}
    // Perform which action on local contract
    enum OP{NOT_SET, MINT,BURN20, BURN721, BURN1155, TRANSFER}
    // when using STORAGE, do not set baseURI, because uri retrieved from source contract is a combination(base+storage)
    enum URI_MODE{NOT_SET, BASE_URI, STORAGE}

    struct PeerInfo {
        OP op; // local: lock/burn/mint/transfer
        EIP eip;// local: 20/721/1155
        uint timestamp;
        address registerer;
        bool enable;
        URI_MODE uriMode;
    }

    struct RouteConfig {
        // key is contract
        mapping(address=>PeerInfo) peers;
        // track all contracts
        address[] peerKeys;
    }
    struct ChainTable {
        // key is chain id
        mapping(uint=>RouteConfig) map;
        // track all chains
        uint[] chains;
    }
    struct RouteTable {
        // key is contract
        mapping(address=>ChainTable) map;
        // track all contracts
        address[] index;
    }
    event DepartureConfigured(address indexed local, uint indexed targetChainId, address remoteContract);

    event ArrivalConfigured(address indexed remoteContract, uint indexed remoteChainId, address localContract);

    // localContract=>(remoteChain=>remoteContract=>info)
    RouteTable internal departureMap;
    // remoteContract=>(remoteChain=>localContract=>info)
    RouteTable internal arrivalMap;

    /**
    * uriMode is here because we need to retrieve uri of NFT when building a CrossEvent
    */
    function registerDeparture(address local, uint targetChainId, OP op, URI_MODE uriMode,
        address remoteContract)
    public onlyRole(Roles.ADD_DEPARTURE) {
        _addRoute(departureMap, local, targetChainId,
            detectLocalEIP(local),
            op, uriMode, remoteContract);
        emit DepartureConfigured(local, targetChainId, remoteContract);
    }

    /**
     * Internal function to add a route
     */
    function _addRoute(RouteTable storage routeTable, address indexContract, uint indexChainId,
        EIP eip,
        OP op, URI_MODE uriMode,
        address valueContract) internal {
        ChainTable storage chainTable = routeTable.map[indexContract];
        if (chainTable.chains.length == 0) {
            // first time adding this contract
            routeTable.index.push(indexContract);
        }
        RouteConfig storage cfg = chainTable.map[indexChainId];
        if (cfg.peerKeys.length == 0) {
            chainTable.chains.push(indexChainId);
        }
        PeerInfo memory info = PeerInfo(op, eip, block.timestamp, msg.sender, true, uriMode);

        require(cfg.peers[valueContract].timestamp == 0, "already registered");
        cfg.peers[valueContract] = info;
        cfg.peerKeys.push(valueContract);
    }

    function detectLocalEIP(address indexContract) public view returns (EIP) {
        if (IERC165(indexContract).supportsInterface(ERC721InterfaceId)) {
            return EIP.EIP721;
        } else if (IERC165(indexContract).supportsInterface(ERC1155InterfaceId)) {
            return EIP.EIP1155;
        } else {
            return EIP.EIP20;
        }
    }


    /**
     * @dev RegisterArrival
     */
    function registerArrival(address remoteContract, uint remoteChainId, OP op, URI_MODE uriMode,
        address localContract)
    public onlyRole(Roles.ADD_ARRIVAL) {
        _addRoute(arrivalMap, remoteContract, remoteChainId,
            detectLocalEIP(localContract),
            op, uriMode, localContract);
        emit ArrivalConfigured(remoteContract, remoteChainId, localContract);
    }
}
