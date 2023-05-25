import {attachT, deploy, deployBeacon, deployWithBeaconProxy, waitTx} from "../lib";
import fs from "fs";
import {readInfo} from "../biz";
import {PeggedERC1155, PeggedERC721, TokenFactory, TokenVault} from "../../typechain-types/contracts/cc";
import {ethers, Transaction} from "ethers";
import {UpgradeableBeacon} from "../../typechain-types/@openzeppelin/contracts/proxy/beacon";
import {PeggedERC20__factory} from "../../typechain-types/factories/contracts/cc";
import {TransactionReceipt} from "@ethersproject/providers";
export async function deployTokenFactory() {
    let {impl:impl20, beacon:beacon20} = await deployBeacon("PeggedERC20", []);
    let {impl:impl721, beacon:beacon721} = await deployBeacon("PeggedERC721", []);
    let {impl:impl1155, beacon:beacon1155} = await deployBeacon("PeggedERC1155", []);
    let {impl:implTokeFactory, beacon:beaconTokeFactory, proxy:tokenFactoryProxy} = await deployWithBeaconProxy(
        "TokenFactory", [beacon20.address, beacon721.address, beacon1155.address], false, false);
    return {
        impl20, beacon20,
        impl721, beacon721,
        impl1155, beacon1155,
        implTokeFactory, beaconTokeFactory, tokenFactoryProxy
    }
}

export async function deployTokenVault() {
    let {impl:implTokeVault, beacon:beaconTokeVault, proxy:vaultProxy} = await deployWithBeaconProxy(
        "TokenVault", [], true);
    return {implTokeVault, beaconTokeVault, vaultProxy}
}
export async function deployBridge(tag:string) {
    const {
        impl20, beacon20,
        impl721, beacon721,
        impl1155, beacon1155,
        implTokeFactory, beaconTokeFactory, tokenFactoryProxy} = await deployTokenFactory();
    const {implTokeVault, beaconTokeVault, vaultProxy} = await deployTokenVault();
    let obj = {
        impl20: impl20.address, beacon20: beacon20.address,
        impl721: impl721.address, beacon721: beacon721.address,
        impl1155: impl1155.address, beacon1155: beacon1155.address,
        implTokeFactory:implTokeFactory.address,
        beaconTokeFactory:beaconTokeFactory.address,
        tokenFactoryProxy: tokenFactoryProxy.address,
        implTokeVault: implTokeVault.address, beaconTokeVault: beaconTokeVault.address,
        vaultProxy:vaultProxy.address,
    };
    const info = JSON.stringify(obj, null, 4)

    tag && fs.writeFileSync(`${tag}`, info);
    return obj;
}
export async function createPeg20(tag, name, symbol) {
    const {tokenFactoryProxy} = readInfo(tag);
    const tkf = await attachT<TokenFactory>("TokenFactory", tokenFactoryProxy);
    const rcpt = await tkf.deployERC20(name, symbol).then(waitTx);
    const {logs} = rcpt;
    // console.log(`logs`, logs)
    const logArr = logs.filter(log=>log.address==tokenFactoryProxy).map(log=>tkf.interface.parseLog(log));
    // console.log(`parsed log`, logArr)
    const creationLog = logArr.find(l=>tkf.interface.events["ERC20_CREATED(address,address)"].name == l.name)
    console.log(`create 20 ${creationLog.args.artifact} , tx ${rcpt.transactionHash}`)
    return creationLog.args.artifact;
}
export async function createPeg721(tag, name, symbol, baseUri) {
    const {tokenFactoryProxy} = readInfo(tag);
    const tkf = await attachT<TokenFactory>("TokenFactory", tokenFactoryProxy);
    const rcpt = await tkf.deployERC721(name, symbol, baseUri).then(waitTx);
    const {logs} = rcpt;
    // console.log(`logs`, logs)
    const logArr = logs.filter(log=>log.address==tokenFactoryProxy).map(log=>tkf.interface.parseLog(log));
    // console.log(`parsed log`, logArr)
    const creationLog = logArr.find(l=>tkf.interface.events["ERC721_CREATED(address,address)"].name == l.name)
    console.log(`create pegged 721 ${creationLog.args.artifact} , tx ${rcpt.transactionHash}`)
    return creationLog.args.artifact;
}
export async function createPeg1155(tag, name, symbol, baseUri) {
    const {tokenFactoryProxy} = readInfo(tag);
    const tkf = await attachT<TokenFactory>("TokenFactory", tokenFactoryProxy);
    const rcpt = await tkf.deployERC1155(name, symbol, baseUri).then(waitTx);
    const {logs} = rcpt;
    // console.log(`logs`, logs)
    const logArr = logs.filter(log=>log.address==tokenFactoryProxy).map(log=>tkf.interface.parseLog(log));
    // console.log(`parsed log`, logArr)
    const creationLog = logArr.find(l=>tkf.interface.events["ERC1155_CREATED(address,address)"].name == l.name)
    console.log(`create 1155 ${creationLog.args.artifact} , tx ${rcpt.transactionHash}`)
    return creationLog.args.artifact;
}
export enum EIP{NOT_SET,EIP20, EIP721, EIP1155}
export enum OP{NOT_SET, MINT,BURN20,BURN721, BURN1155,TRANSFER}
export enum URI_MODE{NOT_SET, BASE_URI, STORAGE}

export async function registerArrival(tag, srcContract, srcChain, localContract, op:OP, uriMode: URI_MODE) {
    console.log(`registerArrival`)
    const {vaultProxy} = readInfo(tag);
    const vault = await attachT<TokenVault>("TokenVault", vaultProxy);
    await vault.registerArrival(srcContract, srcChain, op, uriMode, localContract).then(waitTx)
}

export async function registerDeparture(tag, localContract, dstChain, dstContract, op:OP, uriMode: URI_MODE) {
    console.log(`registerDeparture`)
    const {vaultProxy} = readInfo(tag);
    const vault = await attachT<TokenVault>("TokenVault", vaultProxy);
    await vault.registerDeparture(localContract, dstChain, op, uriMode, dstContract).then(waitTx)
}

export async function upgradeTokenFactory(tag) {
    const {beaconTokeFactory} = readInfo(tag);
    const impl = await deploy("TokenFactory", [`0x${'0'.padStart(40, '0')}`])
    const upgrade = await attachT<UpgradeableBeacon>("UpgradeableBeacon", beaconTokeFactory);
    await upgrade.upgradeTo(impl.address).then(waitTx)
    console.log(`upgrade token factory to ${impl.address}`)
}