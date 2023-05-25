import {attachT, networkInfo, waitTx} from "../lib";
import {
    createPeg20,
    createPeg721,
    deployBridge,
    OP,
    registerArrival,
    registerDeparture, set20beacon,
    upgradeTokenFactory,
    URI_MODE
} from "./lib-bridge";
import {PeggedERC721, TokenVault} from "../../typechain-types/contracts/cc";
import {ethers} from "ethers";

async function main() {
    const {chainId, account} = await networkInfo();
    let tag = `./bridge_${chainId}.json`;
    const {CMD} = process.env;
    console.log(`cmd `, CMD)
    if (CMD === 'deploy') {
        await deployBridge(tag);
    } else if (CMD === 'upTokenFactory') {
        await upgradeTokenFactory(tag)
    } else if (CMD === 'set20beacon') {
        await set20beacon(tag)
        await createPeg20(tag, "Test T20", "t20");
    } else if (CMD === 'test') {
        const {vaultProxy} = await deployBridge(tag);
        const erc721_0 = await createPeg721(tag, "721-0", "p721-0", "https://baidu.com/")
        const erc721_1 = await createPeg721(tag, "721-01", "p721-01", "")
        // 0->1
        await registerArrival(tag, erc721_0, chainId, erc721_1, OP.MINT, URI_MODE.STORAGE);
        await registerDeparture(tag, erc721_0, chainId, erc721_1, OP.NOT_SET, URI_MODE.STORAGE);
        // 1->0
        await registerArrival(tag, erc721_1, chainId, erc721_0, OP.TRANSFER, URI_MODE.NOT_SET);
        await registerDeparture(tag, erc721_1, chainId, erc721_0, OP.BURN721, URI_MODE.NOT_SET);
        //
        const erc721_0_c = await attachT<PeggedERC721>("PeggedERC721", erc721_0);
        const erc721_1_c = await attachT<PeggedERC721>("PeggedERC721", erc721_1);
        await erc721_1_c.transferOwnership(vaultProxy).then(waitTx)
        await erc721_0_c.safeMint(account, 1, "storage-uri-test.json").then(waitTx);
        await cross(account, vaultProxy, erc721_0, chainId, erc721_1, 1);
        await cross(account, vaultProxy, erc721_1, chainId, erc721_0, 1);
    }
}

async function cross(account, vaultProxy, erc721_0, dstChain, erc721_1, tokenId) {
    const vault = await attachT<TokenVault>("TokenVault", vaultProxy);

    const data = ethers.utils.defaultAbiCoder.encode(["uint","address"],[dstChain, erc721_1]);
    const erc721_0_c = await attachT<PeggedERC721>("PeggedERC721", erc721_0);
    const crossReqRcpt = await erc721_0_c["safeTransferFrom(address,address,uint256,bytes)"](account, vaultProxy, tokenId, data)
        .then(waitTx);
    const logArr = crossReqRcpt["logs"].filter(log=>log.address==vaultProxy).map(log=>
        vault.interface.parseLog(log));
    // console.log(`departure log`, logArr)
    const crossEvent = logArr.find(log=>log.name=='CrossRequest')
    console.log(`cross event in tx ${crossReqRcpt.transactionHash}`, crossEvent.args)
    const {args:{toChainId, asset, targetContract, tokenIds, amounts, uris, from, userNonce}} = crossEvent;
    const rcpt = await vault.claimByAdmin(toChainId, asset, targetContract, tokenIds,
        amounts, uris, from, userNonce).then(waitTx)

}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}