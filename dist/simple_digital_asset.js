// simple_digital_asset.ts
import { Account, Aptos, AptosConfig, Network, NetworkToNetworkName } from "@aptos-labs/ts-sdk";
import "dotenv";
var INITIAL_BALANCE = 1e8;
var APTOS_NETWORK = NetworkToNetworkName[process.env.APTOS_NETWORK] || Network.DEVNET;
var config = new AptosConfig({ network: APTOS_NETWORK });
var aptos = new Aptos(config);
var example = async () => {
  console.log(
    "This script will create a collection and mint a digital asset, then transfer it to Bob's account once the bot verification is successful."
  );
  const bob = Account.generate();
  console.log("===BOB's Address ===\n");
  console.log(`bob's address is: ${bob.accountAddress}`);
  await aptos.fundAccount({
    accountAddress: bob.accountAddress,
    amount: INITIAL_BALANCE
  });
  const collectionName = "Example Collection";
  const collectionDescription = "Example description.";
  const collectionURI = "aptos.dev";
  const botVerified = false;
  if (!botVerified) {
    console.log("Bot verification failed. NFT transfer aborted.");
    return;
  }
  console.log("\n=== Bot Verification Successful: Creating the collection and Minting NFT ===\n");
  const createCollectionTransaction = await aptos.createCollectionTransaction({
    creator: bob,
    description: collectionDescription,
    name: collectionName,
    uri: collectionURI
  });
  console.log("\n=== Create the collection ===\n");
  let committedTxn = await aptos.signAndSubmitTransaction({ signer: bob, transaction: createCollectionTransaction });
  let pendingTxn = await aptos.waitForTransaction({ transactionHash: committedTxn.hash });
  const bobsCollection = await aptos.getCollectionData({
    creatorAddress: bob.accountAddress,
    collectionName,
    minimumLedgerVersion: BigInt(pendingTxn.version)
  });
  console.log(`bob's collection: ${JSON.stringify(bobsCollection, null, 4)}`);
  const tokenName = "Example Asset";
  const tokenDescription = "Example asset description.";
  const tokenURI = "aptos.dev/asset";
  console.log("\n===  Minting the digital asset ===\n");
  const mintTokenTransaction = await aptos.mintDigitalAssetTransaction({
    creator: bob,
    collection: collectionName,
    description: tokenDescription,
    name: tokenName,
    uri: tokenURI
  });
  committedTxn = await aptos.signAndSubmitTransaction({ signer: bob, transaction: mintTokenTransaction });
  pendingTxn = await aptos.waitForTransaction({ transactionHash: committedTxn.hash });
  const bobsDigitalAsset = await aptos.getOwnedDigitalAssets({
    ownerAddress: bob.accountAddress,
    minimumLedgerVersion: BigInt(pendingTxn.version)
  });
  console.log(`bob's digital assets balance: ${bobsDigitalAsset.length}`);
  console.log(`bob's digital asset: ${JSON.stringify(bobsDigitalAsset[0], null, 4)}`);
  console.log("\n=== Transfer the digital asset to Bob ===\n");
  const bobDigitalAssetsAfter = await aptos.getOwnedDigitalAssets({
    ownerAddress: bob.accountAddress,
    minimumLedgerVersion: BigInt(pendingTxn.version)
  });
  console.log(`Bob's digital assets balance: ${bobDigitalAssetsAfter.length}`);
};
example();
//# sourceMappingURL=simple_digital_asset.js.map