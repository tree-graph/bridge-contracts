import {attachT, deployBeacon, deployWithBeaconProxy, waitTx} from "../lib";
import fs from "fs";
import {readInfo} from "../biz";
import {TokenFactory, TokenVault} from "../../typechain-types/contracts/cc";
export async function deployTokenFactory() {
    let {impl:impl721, beacon:beacon721} = await deployBeacon("PeggedERC721", []);
    let {impl:implTokeFactory, beacon:beaconTokeFactory, proxy:tokenFactoryProxy} = await deployWithBeaconProxy(
        "TokenFactory", [beacon721.address]);
    return {impl721, beacon721, implTokeFactory, beaconTokeFactory, tokenFactoryProxy}
}

export async function deployTokenVault() {
    let {impl:implTokeVault, beacon:beaconTokeVault, proxy:vaultProxy} = await deployWithBeaconProxy(
        "TokenVault", [], true);
    return {implTokeVault, beaconTokeVault, vaultProxy}
}
export async function deployBridge(tag:string) {
    const {impl721, beacon721, implTokeFactory, beaconTokeFactory, tokenFactoryProxy} = await deployTokenFactory();
    const {implTokeVault, beaconTokeVault, vaultProxy} = await deployTokenVault();
    let obj = {
        impl721: impl721.address, beacon721: beacon721.address, implTokeFactory:implTokeFactory.address,
        beaconTokeFactory:beaconTokeFactory.address,
        tokenFactoryProxy: tokenFactoryProxy.address,
        implTokeVault: implTokeVault.address, beaconTokeVault: beaconTokeVault.address,
        vaultProxy:vaultProxy.address,
    };
    const info = JSON.stringify(obj, null, 4)

    tag && fs.writeFileSync(`${tag}`, info);
    return obj;
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
    console.log(`create ${creationLog.args.artifact} , tx ${rcpt.transactionHash}`)
    return creationLog.args.artifact;
}
export enum EIP{NOT_SET,EIP20, EIP721, EIP1155}
export enum OP{NOT_SET, MINT,BURN20,BURN721, BURN1155,TRANSFER}
export enum URI_MODE{NOT_SET, BASE_URI, STORAGE}

export async function registerArrival(tag, srcContract, srcChain, localContract, op:OP, uriMode: URI_MODE) {
    const {vaultProxy} = readInfo(tag);
    const vault = await attachT<TokenVault>("TokenVault", vaultProxy);
    await vault.registerArrival(srcContract, srcChain, op, uriMode, localContract).then(waitTx)
}
export async function registerDeparture(tag, localContract, dstChain, dstContract, op:OP, uriMode: URI_MODE) {
    const {vaultProxy} = readInfo(tag);
    const vault = await attachT<TokenVault>("TokenVault", vaultProxy);
    await vault.registerDeparture(localContract, dstChain, op, uriMode, dstContract).then(waitTx)
}