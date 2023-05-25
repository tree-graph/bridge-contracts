import {ethers} from "hardhat";
import {Buffer} from "buffer";
import {UpgradeableBeacon} from "../typechain-types/@openzeppelin/contracts/proxy/beacon";
import {formatEther} from "ethers/lib/utils";
import {ERC1967Proxy} from "../typechain-types/@openzeppelin/contracts/proxy/ERC1967";
import {UUPSUpgradeable} from "../typechain-types/@openzeppelin/contracts-upgradeable/proxy/utils";

export async function deploy(name:string, args:any[]) {
    // We get the contract to deploy
    const Factory = await ethers.getContractFactory(name).catch(err=>{
        console.log(`error getContractFactory`, err)
    });
    if (!Factory) {
        return;
    }
    const deployer = await Factory.deploy(...args,
    ).catch(err=>{
        console.log(`args length ${args.length}, [${args.join(', ')}]`)
        console.log(`error deploy ${name}.`, err)
        console.log(`more info `, err.code, err.message, err.data)
    });
    if (!deployer) {
        return;
    }
    const instance = await deployer.deployed();

    console.log(name+" deployed to:", deployer.address);
    return instance;
}
export async function networkInfo() {
    const [signer] = await ethers.getSigners()
    const acc1 = signer.address

    let network = await ethers.provider.getNetwork();
    console.log(`${acc1} balance `, await signer.getBalance().then(formatEther), `network`, network)
    const {chainId} = network;
    return {signer, account: acc1, chainId}
}
export async function deployBeacon(implName:string, argv: any[]) {
    const impl = await deploy(implName, argv);
    const beacon = await deploy("UpgradeableBeacon", [impl!.address]) as UpgradeableBeacon;
    return {impl, beacon}
}
export async function deployWithBeaconProxy(implName:string, initArgv: any[], forceInit = false, hasImplArgs=true) {
    const {impl, beacon} = await deployBeacon(implName, hasImplArgs ? initArgv : []);

    const initReq = initArgv.length||forceInit ? await impl!.populateTransaction['initialize'](...initArgv) : {data: Buffer.from("")};
    const proxy = await deploy("BeaconProxy", [beacon?.address, initReq!.data])
    const instance = await attach(implName, proxy!.address);
    return {impl, proxy, instance, beacon}
}

export async function attachT<T>(name:string, to:string) : Promise<T>{
    return attach(name, to).then(res=>res as any as T)
}

export async function attach(name:string, to:string) {
    const template = await ethers.getContractFactory(name);
    return template.attach(to)
}
export async function upgradeBeacon(beaconAddr: string, implName:string) {
    console.log(`upgradeBeacon, proxy at ${beaconAddr}`)
    const newAppImpl = await deploy(implName, [])
    const beacon = await attach("UpgradeableBeacon", beaconAddr) as UpgradeableBeacon
    const receipt = await beacon.upgradeTo(newAppImpl?.address!).then(tx=>tx.wait())
    return receipt;
}
export async function upgrade1967proxy(proxyAddr:string, implName:string) {
    const impl = await deploy(implName, []);
    const proxy = await ethers.getContractAt("UUPSUpgradeable", proxyAddr).then(res=>res as UUPSUpgradeable);
    await proxy.upgradeTo(impl.address).then(waitTx);
    console.log(`upgraded , proxy is ${proxyAddr}`)
}
export async function deployWith1967Proxy(implName:string, initArgv: any[]) {
    const impl = await deploy(implName, []);
    const initReq = initArgv.length ? await impl!.populateTransaction['initialize'](...initArgv) : {data: Buffer.from("")};
    const proxy = await deploy("ERC1967Proxy", [impl?.address, initReq!.data])
    const instance = await attach(implName, proxy!.address);
    return {impl, proxy, instance}
}

export function waitTx(tx:any) {
    return tx.wait();
}