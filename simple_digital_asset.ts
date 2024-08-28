/* eslint-disable no-console */
/* eslint-disable max-len */

/**
 * This example shows how to use the Aptos client to mint and transfer a Digital Asset.
 */

import { Account, Aptos, AptosConfig, Network, NetworkToNetworkName } from "@aptos-labs/ts-sdk";
import "dotenv";

const INITIAL_BALANCE = 100_000_000;

// Setup the client
const APTOS_NETWORK: Network = NetworkToNetworkName[process.env.APTOS_NETWORK] || Network.DEVNET;
const config = new AptosConfig({ network: APTOS_NETWORK });
const aptos = new Aptos(config);

const example = async () => {
  console.log(
    "This script will create a collection and mint a digital asset, then transfer it to Bob's account once the bot verification is successful.",
  );

  // Create Alice and Bob accounts
  // const alice = Account.generate();
  const bob = Account.generate();

  console.log("===BOB's Address ===\n");
  console.log(`bob's address is: ${bob.accountAddress}`);

  // Fund and create the accounts
  // await aptos.fundAccount({
  //   accountAddress: alice.accountAddress,
  //   amount: INITIAL_BALANCE,
  // });
  await aptos.fundAccount({
    accountAddress: bob.accountAddress,
    amount: INITIAL_BALANCE,
  });

  const collectionName = "Example Collection";
  const collectionDescription = "Example description.";
  const collectionURI = "aptos.dev";

  // Bot Verification Logic: Simulating bot verification (you can replace this with your actual bot logic)
  const botVerified = false; // Assume the bot verification is successful
  if (!botVerified) {
    console.log("Bot verification failed. NFT transfer aborted.");
    return;
  }

  console.log("\n=== Bot Verification Successful: Creating the collection and Minting NFT ===\n");

  // Create the collection
  const createCollectionTransaction = await aptos.createCollectionTransaction({
    creator: bob,
    description: collectionDescription,
    name: collectionName,
    uri: collectionURI,
  });

  console.log("\n=== Create the collection ===\n");
  let committedTxn = await aptos.signAndSubmitTransaction({ signer: bob, transaction: createCollectionTransaction });

  let pendingTxn = await aptos.waitForTransaction({ transactionHash: committedTxn.hash });

  const bobsCollection = await aptos.getCollectionData({
    creatorAddress: bob.accountAddress,
    collectionName,
    minimumLedgerVersion: BigInt(pendingTxn.version),
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
    uri: tokenURI,
  });

  committedTxn = await aptos.signAndSubmitTransaction({ signer: bob, transaction: mintTokenTransaction });
  pendingTxn = await aptos.waitForTransaction({ transactionHash: committedTxn.hash });

  const bobsDigitalAsset = await aptos.getOwnedDigitalAssets({
    ownerAddress: bob.accountAddress,
    minimumLedgerVersion: BigInt(pendingTxn.version),
  });
  console.log(`bob's digital assets balance: ${bobsDigitalAsset.length}`);

  console.log(`bob's digital asset: ${JSON.stringify(bobsDigitalAsset[0], null, 4)}`);

  console.log("\n=== Transfer the digital asset to Bob ===\n");

  // const transferTransaction = await aptos.transferDigitalAssetTransaction({
  //   sender: alice,
  //   digitalAssetAddress: alicesDigitalAsset[0].token_data_id,
  //   recipient: bob.accountAddress,
  // });
  // committedTxn = await aptos.signAndSubmitTransaction({ signer: alice, transaction: transferTransaction });
  // pendingTxn = await aptos.waitForTransaction({ transactionHash: committedTxn.hash });

  // const alicesDigitalAssetsAfter = await aptos.getOwnedDigitalAssets({
  //   ownerAddress: alice.accountAddress,
  //   minimumLedgerVersion: BigInt(pendingTxn.version),
  // });
  // console.log(`Alices's digital assets balance: ${alicesDigitalAssetsAfter.length}`);

  const bobDigitalAssetsAfter = await aptos.getOwnedDigitalAssets({
    ownerAddress: bob.accountAddress,
    minimumLedgerVersion: BigInt(pendingTxn.version),
  });
  console.log(`Bob's digital assets balance: ${bobDigitalAssetsAfter.length}`);
};

example();
