// sponsored_transactions/server_signs_and_submit.ts
import {
  Account,
  AccountAuthenticator,
  Aptos,
  AptosConfig,
  Deserializer,
  Network,
  NetworkToNetworkName,
  SimpleTransaction
} from "@aptos-labs/ts-sdk";
var INITIAL_BALANCE = 1e8;
var TRANSFER_AMOUNT = 100;
var APTOS_NETWORK = NetworkToNetworkName[process.env.APTOS_NETWORK] || Network.DEVNET;
var config = new AptosConfig({ network: APTOS_NETWORK });
var aptos = new Aptos(config);
var sendToOtherServer = async (serializedTransaction, senderAuth, sponsorAuth) => {
  const deserializer = new Deserializer(serializedTransaction);
  const transaction = SimpleTransaction.deserialize(deserializer);
  const deserializer2 = new Deserializer(senderAuth);
  const senderAuthenticator = AccountAuthenticator.deserialize(deserializer2);
  const deserializer3 = new Deserializer(sponsorAuth);
  const feePayerAuthenticator = AccountAuthenticator.deserialize(deserializer3);
  const response = await aptos.transaction.submit.simple({
    transaction,
    senderAuthenticator,
    feePayerAuthenticator
  });
  const executedTransaction = await aptos.waitForTransaction({ transactionHash: response.hash });
  console.log("executed transaction", executedTransaction.hash);
};
var example = async () => {
  const alice = Account.generate();
  const bob = Account.generate();
  const sponsor = Account.generate();
  console.log("=== Addresses ===\n");
  console.log(`Alice's address is: ${alice.accountAddress}`);
  console.log(`Bob's address is: ${bob.accountAddress}`);
  console.log(`Sponsor's address is: ${sponsor.accountAddress}`);
  console.log("\n=== Funding accounts ===\n");
  await aptos.fundAccount({
    accountAddress: alice.accountAddress,
    amount: INITIAL_BALANCE
  });
  await aptos.fundAccount({ accountAddress: sponsor.accountAddress, amount: INITIAL_BALANCE });
  console.log("\n=== Accounts funded ===\n");
  const transaction = await aptos.transaction.build.simple({
    sender: alice.accountAddress,
    withFeePayer: true,
    data: {
      function: "0x1::aptos_account::transfer",
      functionArguments: [bob.accountAddress, TRANSFER_AMOUNT]
    }
  });
  const senderAuth = aptos.transaction.sign({ signer: alice, transaction });
  const sponsorAuth = aptos.transaction.signAsFeePayer({ signer: sponsor, transaction });
  await sendToOtherServer(transaction.bcsToBytes(), senderAuth.bcsToBytes(), sponsorAuth.bcsToBytes());
};
example();
//# sourceMappingURL=server_signs_and_submit.js.map