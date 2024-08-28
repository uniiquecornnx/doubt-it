// multisig_v2.ts
import { sha3_256 as sha3Hash } from "@noble/hashes/sha3";
import {
  Account,
  Aptos,
  AptosConfig,
  Network,
  NetworkToNetworkName,
  MoveString,
  generateRawTransaction,
  TransactionPayloadMultiSig,
  MultiSig,
  AccountAddress,
  SimpleTransaction,
  generateTransactionPayload
} from "@aptos-labs/ts-sdk";
var APTOS_NETWORK = NetworkToNetworkName[process.env.APTOS_NETWORK] || Network.DEVNET;
var config = new AptosConfig({ network: APTOS_NETWORK });
var aptos = new Aptos(config);
var owner1 = Account.generate();
var owner2 = Account.generate();
var owner3 = Account.generate();
var multisigAddress;
var recipient = Account.generate();
var transactionPayload;
var owner4 = Account.generate();
var getNumberOfOwners = async () => {
  const multisigAccountResource = await aptos.getAccountResource({
    accountAddress: multisigAddress,
    resourceType: "0x1::multisig_account::MultisigAccount"
  });
  console.log("Number of Owners:", multisigAccountResource.owners.length);
};
var getSignatureThreshold = async () => {
  const multisigAccountResource = await aptos.getAccountResource({
    accountAddress: multisigAddress,
    resourceType: "0x1::multisig_account::MultisigAccount"
  });
  console.log("Signature Threshold:", multisigAccountResource.num_signatures_required);
};
var fundOwnerAccounts = async () => {
  await aptos.fundAccount({ accountAddress: owner1.accountAddress, amount: 1e8 });
  await aptos.fundAccount({ accountAddress: owner2.accountAddress, amount: 1e8 });
  await aptos.fundAccount({ accountAddress: owner3.accountAddress, amount: 1e8 });
  console.log(`owner1: ${owner1.accountAddress.toString()}`);
  console.log(`owner2: ${owner2.accountAddress.toString()}`);
  console.log(`owner3: ${owner3.accountAddress.toString()}`);
};
var settingUpMultiSigAccount = async () => {
  console.log("Setting up a 2-of-3 multisig account...");
  const payload = {
    function: "0x1::multisig_account::get_next_multisig_account_address",
    functionArguments: [owner1.accountAddress.toString()]
  };
  [multisigAddress] = await aptos.view({ payload });
  const createMultisig = await aptos.transaction.build.simple({
    sender: owner1.accountAddress,
    data: {
      function: "0x1::multisig_account::create_with_owners",
      functionArguments: [
        [owner2.accountAddress, owner3.accountAddress],
        2,
        ["Example"],
        [new MoveString("SDK").bcsToBytes()]
      ]
    }
  });
  const owner1Authenticator = aptos.transaction.sign({ signer: owner1, transaction: createMultisig });
  const res = await aptos.transaction.submit.simple({
    senderAuthenticator: owner1Authenticator,
    transaction: createMultisig
  });
  await aptos.waitForTransaction({ transactionHash: res.hash });
  console.log("Multisig Account Address:", multisigAddress);
  await getSignatureThreshold();
  await getNumberOfOwners();
};
var fundMultiSigAccount = async () => {
  console.log("Funding the multisig account...");
  await aptos.fundAccount({ accountAddress: multisigAddress, amount: 1e8 });
};
var createMultiSigTransferTransaction = async () => {
  console.log("Creating a multisig transaction to transfer coins...");
  transactionPayload = await generateTransactionPayload({
    multisigAddress,
    function: "0x1::aptos_account::transfer",
    functionArguments: [recipient.accountAddress, 1e6],
    aptosConfig: config
  });
  const transactionToSimulate = await generateRawTransaction({
    aptosConfig: config,
    sender: owner2.accountAddress,
    payload: transactionPayload
  });
  const simulateMultisigTx = await aptos.transaction.simulate.simple({
    signerPublicKey: owner2.publicKey,
    transaction: new SimpleTransaction(transactionToSimulate)
  });
  console.log("simulateMultisigTx", simulateMultisigTx);
  const createMultisigTx = await aptos.transaction.build.simple({
    sender: owner2.accountAddress,
    data: {
      function: "0x1::multisig_account::create_transaction",
      functionArguments: [multisigAddress, transactionPayload.multiSig.transaction_payload.bcsToBytes()]
    }
  });
  const createMultisigTxAuthenticator = aptos.transaction.sign({ signer: owner2, transaction: createMultisigTx });
  const createMultisigTxResponse = await aptos.transaction.submit.simple({
    senderAuthenticator: createMultisigTxAuthenticator,
    transaction: createMultisigTx
  });
  await aptos.waitForTransaction({ transactionHash: createMultisigTxResponse.hash });
};
var executeMultiSigTransferTransaction = async () => {
  console.log("Owner 2 can now execute the transfer transaction as it already has 2 approvals (from owners 2 and 3).");
  const rawTransaction = await generateRawTransaction({
    aptosConfig: config,
    sender: owner2.accountAddress,
    payload: transactionPayload
  });
  const transaction = new SimpleTransaction(rawTransaction);
  const owner2Authenticator = aptos.transaction.sign({ signer: owner2, transaction });
  const transferTransactionReponse = await aptos.transaction.submit.simple({
    senderAuthenticator: owner2Authenticator,
    transaction
  });
  await aptos.waitForTransaction({ transactionHash: transferTransactionReponse.hash });
};
var checkBalance = async () => {
  const accountResource = await aptos.getAccountResource({
    accountAddress: recipient.accountAddress,
    resourceType: "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
  });
  console.log("Recipient's balance after transfer", accountResource.coin.value);
};
var createMultiSigTransferTransactionWithPayloadHash = async () => {
  console.log("Creating another multisig transaction using payload hash...");
  const transferTxPayloadHash = sha3Hash.create();
  transferTxPayloadHash.update(transactionPayload.multiSig.transaction_payload.bcsToBytes());
  const createMultisigTxWithHash = await aptos.transaction.build.simple({
    sender: owner2.accountAddress,
    data: {
      function: "0x1::multisig_account::create_transaction_with_hash",
      functionArguments: [multisigAddress, transferTxPayloadHash.digest()]
    }
  });
  const createMultisigTxWithHashAuthenticator = aptos.transaction.sign({
    signer: owner2,
    transaction: createMultisigTxWithHash
  });
  const createMultisigTxWithHashResponse = await aptos.transaction.submit.simple({
    senderAuthenticator: createMultisigTxWithHashAuthenticator,
    transaction: createMultisigTxWithHash
  });
  await aptos.waitForTransaction({ transactionHash: createMultisigTxWithHashResponse.hash });
};
var executeMultiSigTransferTransactionWithPayloadHash = async () => {
  console.log(
    "Owner 2 can now execute the transfer with hash transaction as it already has 2 approvals (from owners 2 and 3)."
  );
  const createTransactionWithHashRawTransaction = await generateRawTransaction({
    aptosConfig: config,
    sender: owner2.accountAddress,
    payload: transactionPayload
  });
  const transaction = new SimpleTransaction(createTransactionWithHashRawTransaction);
  const owner2Authenticator2 = aptos.transaction.sign({
    signer: owner2,
    transaction
  });
  const multisigTxExecution2Reponse = await aptos.transaction.submit.simple({
    senderAuthenticator: owner2Authenticator2,
    transaction
  });
  await aptos.waitForTransaction({ transactionHash: multisigTxExecution2Reponse.hash });
};
var createAddingAnOwnerToMultiSigAccountTransaction = async () => {
  console.log("Adding an owner to the multisig account...");
  const addOwnerTransactionPayload = await generateTransactionPayload({
    multisigAddress,
    function: "0x1::multisig_account::add_owner",
    functionArguments: [owner4.accountAddress],
    aptosConfig: config
  });
  const createAddOwnerTransaction = await aptos.transaction.build.simple({
    sender: owner2.accountAddress,
    data: {
      function: "0x1::multisig_account::create_transaction",
      functionArguments: [multisigAddress, addOwnerTransactionPayload.multiSig.transaction_payload.bcsToBytes()]
    }
  });
  const createAddOwnerTxAuthenticator = aptos.transaction.sign({
    signer: owner2,
    transaction: createAddOwnerTransaction
  });
  const createAddOwnerTxResponse = await aptos.transaction.submit.simple({
    senderAuthenticator: createAddOwnerTxAuthenticator,
    transaction: createAddOwnerTransaction
  });
  await aptos.waitForTransaction({ transactionHash: createAddOwnerTxResponse.hash });
};
var executeAddingAnOwnerToMultiSigAccountTransaction = async () => {
  console.log(
    "Owner 2 can now execute the adding an owner transaction as it already has 2 approvals (from owners 2 and 3)."
  );
  const multisigTxExecution3 = await generateRawTransaction({
    aptosConfig: config,
    sender: owner2.accountAddress,
    payload: new TransactionPayloadMultiSig(new MultiSig(AccountAddress.fromString(multisigAddress)))
  });
  const transaction = new SimpleTransaction(multisigTxExecution3);
  const owner2Authenticator3 = aptos.transaction.sign({
    signer: owner2,
    transaction
  });
  const multisigTxExecution3Reponse = await aptos.transaction.submit.simple({
    senderAuthenticator: owner2Authenticator3,
    transaction
  });
  await aptos.waitForTransaction({ transactionHash: multisigTxExecution3Reponse.hash });
};
var createRemovingAnOwnerToMultiSigAccount = async () => {
  console.log("Removing an owner from the multisig account...");
  const removeOwnerPayload = await generateTransactionPayload({
    multisigAddress,
    function: "0x1::multisig_account::remove_owner",
    functionArguments: [owner4.accountAddress],
    aptosConfig: config
  });
  const removeOwnerTx = await aptos.transaction.build.simple({
    sender: owner2.accountAddress,
    data: {
      function: "0x1::multisig_account::create_transaction",
      functionArguments: [multisigAddress, removeOwnerPayload.multiSig.transaction_payload.bcsToBytes()]
    }
  });
  const createRemoveOwnerTxAuthenticator = aptos.transaction.sign({
    signer: owner2,
    transaction: removeOwnerTx
  });
  const createRemoveOwnerTxResponse = await aptos.transaction.submit.simple({
    senderAuthenticator: createRemoveOwnerTxAuthenticator,
    transaction: removeOwnerTx
  });
  await aptos.waitForTransaction({ transactionHash: createRemoveOwnerTxResponse.hash });
};
var executeRemovingAnOwnerToMultiSigAccount = async () => {
  console.log(
    "Owner 2 can now execute the removing an owner transaction as it already has 2 approvals (from owners 2 and 3)."
  );
  const multisigTxExecution4 = await generateRawTransaction({
    aptosConfig: config,
    sender: owner2.accountAddress,
    payload: new TransactionPayloadMultiSig(new MultiSig(AccountAddress.fromString(multisigAddress)))
  });
  const transaction = new SimpleTransaction(multisigTxExecution4);
  const owner2Authenticator4 = aptos.transaction.sign({
    signer: owner2,
    transaction
  });
  const multisigTxExecution4Reponse = await aptos.transaction.submit.simple({
    senderAuthenticator: owner2Authenticator4,
    transaction
  });
  await aptos.waitForTransaction({ transactionHash: multisigTxExecution4Reponse.hash });
};
var createChangeSignatureThresholdTransaction = async () => {
  console.log("Changing the signature threshold to 3-of-3...");
  const changeSigThresholdPayload = await generateTransactionPayload({
    multisigAddress,
    function: "0x1::multisig_account::update_signatures_required",
    functionArguments: [3],
    aptosConfig: config
  });
  const changeSigThresholdTx = await aptos.transaction.build.simple({
    sender: owner2.accountAddress,
    data: {
      function: "0x1::multisig_account::create_transaction",
      functionArguments: [multisigAddress, changeSigThresholdPayload.multiSig.transaction_payload.bcsToBytes()]
    }
  });
  const changeSigThresholdAuthenticator = aptos.transaction.sign({
    signer: owner2,
    transaction: changeSigThresholdTx
  });
  const changeSigThresholdResponse = await aptos.transaction.submit.simple({
    senderAuthenticator: changeSigThresholdAuthenticator,
    transaction: changeSigThresholdTx
  });
  await aptos.waitForTransaction({ transactionHash: changeSigThresholdResponse.hash });
};
var executeChangeSignatureThresholdTransaction = async () => {
  console.log(
    "Owner 2 can now execute the change signature threshold transaction as it already has 2 approvals (from owners 2 and 3)."
  );
  const multisigTxExecution5 = await generateRawTransaction({
    aptosConfig: config,
    sender: owner2.accountAddress,
    payload: new TransactionPayloadMultiSig(new MultiSig(AccountAddress.fromString(multisigAddress)))
  });
  const transaction = new SimpleTransaction(multisigTxExecution5);
  const owner2Authenticator5 = aptos.transaction.sign({
    signer: owner2,
    transaction
  });
  const multisigTxExecution5Reponse = await aptos.transaction.submit.simple({
    senderAuthenticator: owner2Authenticator5,
    transaction
  });
  await aptos.waitForTransaction({ transactionHash: multisigTxExecution5Reponse.hash });
};
var rejectAndApprove = async (aprroveOwner, rejectOwner, transactionId) => {
  console.log("Owner 1 rejects but owner 3 approves.");
  const rejectTx = await aptos.transaction.build.simple({
    sender: aprroveOwner.accountAddress,
    data: {
      function: "0x1::multisig_account::reject_transaction",
      functionArguments: [multisigAddress, transactionId]
    }
  });
  const rejectSenderAuthenticator = aptos.transaction.sign({ signer: aprroveOwner, transaction: rejectTx });
  const rejectTxResponse = await aptos.transaction.submit.simple({
    senderAuthenticator: rejectSenderAuthenticator,
    transaction: rejectTx
  });
  await aptos.waitForTransaction({ transactionHash: rejectTxResponse.hash });
  const approveTx = await aptos.transaction.build.simple({
    sender: rejectOwner.accountAddress,
    data: {
      function: "0x1::multisig_account::approve_transaction",
      functionArguments: [multisigAddress, transactionId]
    }
  });
  const approveSenderAuthenticator = aptos.transaction.sign({ signer: rejectOwner, transaction: approveTx });
  const approveTxResponse = await aptos.transaction.submit.simple({
    senderAuthenticator: approveSenderAuthenticator,
    transaction: approveTx
  });
  await aptos.waitForTransaction({ transactionHash: approveTxResponse.hash });
};
var main = async () => {
  await fundOwnerAccounts();
  await settingUpMultiSigAccount();
  await fundMultiSigAccount();
  await createMultiSigTransferTransaction();
  await rejectAndApprove(owner1, owner3, 1);
  await executeMultiSigTransferTransaction();
  await checkBalance();
  await createMultiSigTransferTransactionWithPayloadHash();
  await rejectAndApprove(owner1, owner3, 2);
  await executeMultiSigTransferTransactionWithPayloadHash();
  await checkBalance();
  await createAddingAnOwnerToMultiSigAccountTransaction();
  await rejectAndApprove(owner1, owner3, 3);
  await executeAddingAnOwnerToMultiSigAccountTransaction();
  await getNumberOfOwners();
  await createRemovingAnOwnerToMultiSigAccount();
  await rejectAndApprove(owner1, owner3, 4);
  await executeRemovingAnOwnerToMultiSigAccount();
  await getNumberOfOwners();
  await createChangeSignatureThresholdTransaction();
  await rejectAndApprove(owner1, owner3, 5);
  await executeChangeSignatureThresholdTransaction();
  await getSignatureThreshold();
  console.log("Multisig setup and transactions complete.");
};
main();
//# sourceMappingURL=multisig_v2.js.map