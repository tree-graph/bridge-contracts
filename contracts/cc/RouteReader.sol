// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./Router.sol";

contract RouteReader is Router {
    function listDepartureIndex(uint offset, uint size) public view returns (address[] memory, uint total) {
        return _listRouteIndex(departureMap, offset, size);
    }
    function listArrivalIndex(uint offset, uint size) public view returns (address[] memory, uint total) {
        return _listRouteIndex(arrivalMap, offset, size);
    }
    function _listRouteIndex(RouteTable storage routeTable, uint offset, uint size) internal view returns (address[] memory, uint total) {
        if (offset+size>routeTable.index.length) {
            size = routeTable.index.length - offset;
        }
        address[] memory arr = new address[](size);
        for(uint i=0; i<size; i++) {
            arr[i] = routeTable.index[offset+i];
        }
        return (arr, routeTable.index.length);
    }

    function listDepartureChainIndex(address index, uint offset, uint size) public view returns (uint[] memory, uint total) {
        return _listChainIndex(departureMap.map[index], offset, size);
    }
    function listArrivalChainIndex(address index, uint offset, uint size) public view returns (uint[] memory, uint total) {
        return _listChainIndex(arrivalMap.map[index], offset, size);
    }
    function _listChainIndex(ChainTable storage chainTable, uint offset, uint size) internal view returns (uint[] memory, uint total) {
        if (offset+size> chainTable.chains.length) {
            size = chainTable.chains.length - offset;
        }
        uint[] memory arr = new uint[](size);
        for(uint i=0; i<size; i++) {
            arr[i] = chainTable.chains[offset+i];
        }
        return (arr, chainTable.chains.length);
    }

    function listDeparturePeerIndex(address index, uint chain, uint offset, uint size) public view returns (address[] memory, uint total) {
        return _listPeerIndex(departureMap.map[index].map[chain], offset, size);
    }
    function listArrivalPeerIndex(address index, uint chain, uint offset, uint size) public view returns (address[] memory, uint total) {
        return _listPeerIndex(arrivalMap.map[index].map[chain], offset, size);
    }
    function _listPeerIndex(RouteConfig storage routeConfig, uint offset, uint size) internal view returns (address[] memory, uint total) {
        if (offset+size> routeConfig.peerKeys.length) {
            size = routeConfig.peerKeys.length - offset;
        }
        address[] memory arr = new address[](size);
        for(uint i=0; i<size; i++) {
            arr[i] = routeConfig.peerKeys[offset+i];
        }
        return (arr, routeConfig.peerKeys.length);
    }

    function getDepartureInfo(address index, uint chain, address peer) public view returns (PeerInfo memory) {
        return departureMap.map[index].map[chain].peers[peer];
    }

    function getArrivalInfo(address index, uint chain, address peer) public view returns (PeerInfo memory) {
        return arrivalMap.map[index].map[chain].peers[peer];
    }
}
