// sponsored_transactions/server_as_sponsor.ts
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
var sendToTheSponsorServer = async (transactionBytes) => {
  const sponsor = Account.generate();
  console.log(`Sponsor's address is: ${sponsor.accountAddress}`);
  await aptos.fundAccount({ accountAddress: sponsor.accountAddress, amount: INITIAL_BALANCE });
  const deserializer = new Deserializer(transactionBytes);
  const transaction = SimpleTransaction.deserialize(deserializer);
  const sponsorAuth = aptos.transaction.signAsFeePayer({
    signer: sponsor,
    transaction
  });
  const sponsorAuthBytes = sponsorAuth.bcsToBytes();
  return { sponsorAuthBytes, signedTransaction: transaction };
};
var example = async () => {
  const alice = Account.generate();
  const bob = Account.generate();
  console.log("=== Addresses ===\n");
  console.log(`Alice's address is: ${alice.accountAddress}`);
  console.log(`Bob's address is: ${bob.accountAddress}`);
  console.log("\n=== Funding accounts ===\n");
  await aptos.fundAccount({
    accountAddress: alice.accountAddress,
    amount: INITIAL_BALANCE
  });
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
  const { sponsorAuthBytes, signedTransaction } = await sendToTheSponsorServer(transaction.bcsToBytes());
  const deserializer = new Deserializer(sponsorAuthBytes);
  const feePayerAuthenticator = AccountAuthenticator.deserialize(deserializer);
  const response = await aptos.transaction.submit.simple({
    transaction: signedTransaction,
    senderAuthenticator: senderAuth,
    feePayerAuthenticator
  });
  const executedTransaction = await aptos.waitForTransaction({ transactionHash: response.hash });
  console.log("executed transaction", executedTransaction.hash);
};
example();
//# sourceMappingURL=server_as_sponsor.js.map