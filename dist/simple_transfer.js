// simple_transfer.ts
import {
  Account,
  Aptos,
  AptosConfig,
  Network,
  NetworkToNetworkName,
  parseTypeTag
} from "@aptos-labs/ts-sdk";
var APTOS_COIN = "0x1::aptos_coin::AptosCoin";
var COIN_STORE = "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>";
var ALICE_INITIAL_BALANCE = 1e8;
var BOB_INITIAL_BALANCE = 100;
var TRANSFER_AMOUNT = 100;
var APTOS_NETWORK = NetworkToNetworkName[process.env.APTOS_NETWORK] || Network.DEVNET;
var balance = async (aptos, name, address) => {
  const resource = await aptos.getAccountResource({
    accountAddress: address,
    resourceType: COIN_STORE
  });
  const amount = Number(resource.coin.value);
  console.log(`${name}'s balance is: ${amount}`);
  return amount;
};
var example = async () => {
  console.log("This example will create two accounts (Alice and Bob), fund them, and transfer between them.");
  const config = new AptosConfig({ network: APTOS_NETWORK });
  const aptos = new Aptos(config);
  const alice = Account.generate();
  const bob = Account.generate();
  console.log("=== Addresses ===\n");
  console.log(`Alice's address is: ${alice.accountAddress}`);
  console.log(`Bob's address is: ${bob.accountAddress}`);
  console.log("\n=== Funding accounts ===\n");
  const aliceFundTxn = await aptos.fundAccount({
    accountAddress: alice.accountAddress,
    amount: ALICE_INITIAL_BALANCE
  });
  console.log("Alice's fund transaction: ", aliceFundTxn);
  const bobFundTxn = await aptos.fundAccount({
    accountAddress: bob.accountAddress,
    amount: BOB_INITIAL_BALANCE
  });
  console.log("Bob's fund transaction: ", bobFundTxn);
  console.log("\n=== Balances ===\n");
  const aliceBalance = await balance(aptos, "Alice", alice.accountAddress);
  const bobBalance = await balance(aptos, "Bob", bob.accountAddress);
  if (aliceBalance !== ALICE_INITIAL_BALANCE)
    throw new Error("Alice's balance is incorrect");
  if (bobBalance !== BOB_INITIAL_BALANCE)
    throw new Error("Bob's balance is incorrect");
  const txn = await aptos.transaction.build.simple({
    sender: alice.accountAddress,
    data: {
      function: "0x1::coin::transfer",
      typeArguments: [parseTypeTag(APTOS_COIN)],
      functionArguments: [bob.accountAddress, TRANSFER_AMOUNT]
    }
  });
  console.log("\n=== Transfer transaction ===\n");
  const committedTxn = await aptos.signAndSubmitTransaction({ signer: alice, transaction: txn });
  await aptos.waitForTransaction({ transactionHash: committedTxn.hash });
  console.log(`Committed transaction: ${committedTxn.hash}`);
  console.log("\n=== Balances after transfer ===\n");
  const newAliceBalance = await balance(aptos, "Alice", alice.accountAddress);
  const newBobBalance = await balance(aptos, "Bob", bob.accountAddress);
  if (newBobBalance !== TRANSFER_AMOUNT + BOB_INITIAL_BALANCE)
    throw new Error("Bob's balance after transfer is incorrect");
  if (newAliceBalance >= ALICE_INITIAL_BALANCE - TRANSFER_AMOUNT)
    throw new Error("Alice's balance after transfer is incorrect");
};
example();
//# sourceMappingURL=simple_transfer.js.map