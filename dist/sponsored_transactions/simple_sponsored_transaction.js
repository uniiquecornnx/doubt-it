// sponsored_transactions/simple_sponsored_transaction.ts
import "dotenv";
import { Account, Aptos, AptosConfig, Network, NetworkToNetworkName } from "@aptos-labs/ts-sdk";
var ALICE_INITIAL_BALANCE = 1e8;
var SPONSOR_INITIAL_BALANCE = 1e8;
var BOB_INITIAL_BALANCE = 0;
var TRANSFER_AMOUNT = 10;
var APTOS_NETWORK = NetworkToNetworkName[process.env.APTOS_NETWORK] || Network.DEVNET;
var example = async () => {
  console.log(
    "This example will create three accounts (Alice, Bob and Sponsor), fund Alice and Sponsor, transfer between Alice and Bob with sponsor to pay the gas fee."
  );
  const aptosConfig = new AptosConfig({ network: APTOS_NETWORK });
  const aptos = new Aptos(aptosConfig);
  const alice = Account.generate();
  const bob = Account.generate();
  const sponsor = Account.generate();
  const aliceAddress = alice.accountAddress;
  const bobAddress = bob.accountAddress;
  const sponsorAddress = sponsor.accountAddress;
  console.log("=== Addresses ===\n");
  console.log(`Alice's address is: ${aliceAddress}`);
  console.log(`Bob's address is: ${bobAddress}`);
  console.log(`Sponsor's address is: ${sponsorAddress}`);
  await aptos.fundAccount({ accountAddress: aliceAddress, amount: ALICE_INITIAL_BALANCE });
  await aptos.fundAccount({ accountAddress: sponsorAddress, amount: SPONSOR_INITIAL_BALANCE });
  const aliceBalanceBefore = await aptos.getAccountCoinsData({ accountAddress: aliceAddress });
  const sponsorBalanceBefore = await aptos.getAccountCoinsData({ accountAddress: sponsorAddress });
  console.log("\n=== Balances ===\n");
  console.log(`Alice's balance is: ${aliceBalanceBefore[0].amount}`);
  console.log(`Bobs's balance is: ${BOB_INITIAL_BALANCE}`);
  console.log(`Sponsor's balance is: ${sponsorBalanceBefore[0].amount}`);
  if (aliceBalanceBefore[0].amount !== ALICE_INITIAL_BALANCE)
    throw new Error("Alice's balance is incorrect");
  if (sponsorBalanceBefore[0].amount !== SPONSOR_INITIAL_BALANCE)
    throw new Error("Sponsors's balance is incorrect");
  console.log("\n=== Submitting Transaction ===\n");
  const transaction = await aptos.transaction.build.simple({
    sender: aliceAddress,
    withFeePayer: true,
    data: {
      function: "0x1::aptos_account::transfer",
      functionArguments: [bob.accountAddress, TRANSFER_AMOUNT]
    }
  });
  const senderSignature = aptos.transaction.sign({ signer: alice, transaction });
  const sponsorSignature = aptos.transaction.signAsFeePayer({ signer: sponsor, transaction });
  const committedTxn = await aptos.transaction.submit.simple({
    transaction,
    senderAuthenticator: senderSignature,
    feePayerAuthenticator: sponsorSignature
  });
  console.log(`Submitted transaction: ${committedTxn.hash}`);
  const response = await aptos.waitForTransaction({ transactionHash: committedTxn.hash });
  console.log("\n=== Balances after transfer ===\n");
  const aliceBalanceAfter = await aptos.getAccountCoinsData({
    accountAddress: aliceAddress,
    minimumLedgerVersion: BigInt(response.version)
  });
  const bobBalanceAfter = await aptos.getAccountCoinsData({ accountAddress: bobAddress });
  const sponsorBalanceAfter = await aptos.getAccountCoinsData({ accountAddress: sponsorAddress });
  if (bobBalanceAfter[0].amount !== TRANSFER_AMOUNT)
    throw new Error("Bob's balance after transfer is incorrect");
  if (aliceBalanceAfter[0].amount !== ALICE_INITIAL_BALANCE - TRANSFER_AMOUNT)
    throw new Error("Alice's balance after transfer is incorrect");
  if (sponsorBalanceAfter[0].amount >= SPONSOR_INITIAL_BALANCE)
    throw new Error("Sponsor's balance after transfer is incorrect");
  console.log(`Alice's final balance is: ${aliceBalanceAfter[0].amount}`);
  console.log(`Bob's balance is: ${bobBalanceAfter[0].amount}`);
  console.log(`Sponsor's balance is: ${sponsorBalanceAfter[0].amount}`);
};
example();
//# sourceMappingURL=simple_sponsored_transaction.js.map