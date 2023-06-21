import {attachT, networkInfo, waitTx} from "../lib";
import {
    createPeg1155,
    createPeg20,
    createPeg721,
    deployBridge, IToken,
    OP,
    registerArrival,
    registerDeparture, set20beacon, Token721,
    upgradeTokenFactory,
    URI_MODE
} from "./lib-bridge";
import {PeggedERC1155, PeggedERC721, TokenVault} from "../../typechain-types/contracts/cc";
import {ethers} from "ethers";

async function testNFT(tag: string, erc721_0, chainId, erc721_1, departureOp: OP.BURN721, vaultProxy, account: string, tokenId: number, amount: number) {
    // 0->1
    await registerArrival(tag, erc721_0, chainId, erc721_1, OP.MINT, URI_MODE.STORAGE);
    await registerDeparture(tag, erc721_0, chainId, erc721_1, OP.NOT_SET, URI_MODE.STORAGE);
    // 1->0
    await registerArrival(tag, erc721_1, chainId, erc721_0, OP.TRANSFER, URI_MODE.NOT_SET);
    await registerDeparture(tag, erc721_1, chainId, erc721_0, departureOp, URI_MODE.NOT_SET);
    //
    const erc721_0_c = new Token721();
    await erc721_0_c.init(erc721_0);
    const erc721_1_c = new Token721();
    await erc721_1_c.init(erc721_1);
    await erc721_1_c.contract.transferOwnership(vaultProxy).then(waitTx)
    await erc721_0_c.mint(account, tokenId, amount, "storage-uri-test.json").then(waitTx);
    await cross721(account, vaultProxy, erc721_0_c, chainId, erc721_1, tokenId, true);
    await cross721(account, vaultProxy, erc721_1_c, chainId, erc721_0, tokenId, true);
}

async function test721(tag: string, chainId, account: string, claim=true) {
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
    await erc721_0_c.safeMint(account, 1, "storage-uri-test721.json").then(waitTx);
    await cross721(account, vaultProxy, erc721_0, chainId, erc721_1, 1, claim);
    if (claim) {
        await cross721(account, vaultProxy, erc721_1, chainId, erc721_0, 1, claim);
    }
}

async function test1155(tag: string, chainId, account: string) {
    const {vaultProxy} = await deployBridge(tag);
    const erc1155_0 = await createPeg1155(tag, "1155-0", "p1155-0", "https://baidu.com/")
    const erc1155_1 = await createPeg1155(tag, "1155-01", "p1155-01", "")
    // 0->1
    await registerArrival(tag, erc1155_0, chainId, erc1155_1, OP.MINT, URI_MODE.STORAGE);
    await registerDeparture(tag, erc1155_0, chainId, erc1155_1, OP.NOT_SET, URI_MODE.STORAGE);
    // 1->0
    await registerArrival(tag, erc1155_1, chainId, erc1155_0, OP.TRANSFER, URI_MODE.NOT_SET);
    await registerDeparture(tag, erc1155_1, chainId, erc1155_0, OP.BURN1155, URI_MODE.NOT_SET);
    //
    const erc1155_0_c = await attachT<PeggedERC1155>("PeggedERC1155", erc1155_0);
    const erc1155_1_c = await attachT<PeggedERC1155>("PeggedERC1155", erc1155_1);
    await erc1155_1_c.transferOwnership(vaultProxy).then(waitTx)
    await erc1155_0_c.safeMint(account, 1, 100).then(waitTx);
    await erc1155_0_c.setURI(1, "storage-uri-test1155.json").then(waitTx)
    await cross1155(account, vaultProxy, erc1155_0, chainId, erc1155_1, 1);
    await cross1155(account, vaultProxy, erc1155_1, chainId, erc1155_0, 1);
}

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
        await createPeg20(tag, "Test T20", "t20");
    } else if (CMD === 'test1155') {
        await test1155(tag, chainId, account);
    } else if (CMD === 'test721') {
        // chain id may be duplicate, so we use central db id.
        const chainDbId = 1
        await test721(tag, chainDbId, account, false);
    }
}

async function cross721(account, vaultProxy, erc721_0, dstChain, erc721_1, tokenId, claim) {
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
    if (claim) {
        const {args: {toChainId, asset, targetContract, tokenIds, amounts, uris, from, userNonce}} = crossEvent;
        const rcpt = await vault.claimByAdmin(toChainId, asset, targetContract, tokenIds,
            amounts, uris, from, userNonce).then(waitTx)
        console.log(`claim by admin logs `, rcpt.logs)
    }
}

async function cross1155(account, vaultProxy, erc1155_0, dstChain, erc1155_1, tokenId) {
    const vault = await attachT<TokenVault>("TokenVault", vaultProxy);

    const data = ethers.utils.defaultAbiCoder.encode(["uint","address"],[dstChain, erc1155_1]);
    const erc1155_0_c = await attachT<PeggedERC1155>("PeggedERC1155", erc1155_0);
    const crossReqRcpt = await erc1155_0_c["safeTransferFrom(address,address,uint256,uint256,bytes)"](account, vaultProxy, tokenId, 50, data)
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