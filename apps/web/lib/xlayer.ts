import { ethers } from "ethers";
import type { VerificationResult } from "@prooflayer/verifier";

const ABI = [
  "function anchor(bytes32 claimId,address subject,bytes32 evidenceHash,bytes32 resultHash,bytes32 policyHash,bytes32 verifierId,uint8 confidence,uint8 verdict,uint64 expiresAt)",
];

type XLayerNetwork = "testnet" | "mainnet";

function selectedNetwork(): XLayerNetwork {
  return process.env.XLAYER_NETWORK === "mainnet" ? "mainnet" : "testnet";
}

export function explorerUrlForChain(chainId: number) {
  return chainId === 196
    ? (process.env.XLAYER_MAINNET_EXPLORER || "https://www.okx.com/web3/explorer/xlayer")
    : (process.env.XLAYER_TESTNET_EXPLORER || "https://www.okx.com/web3/explorer/xlayer-test");
}

function asBytes32(value: string) {
  const normalized = value.startsWith("0x") ? value : "0x" + value;
  if (/^0x[0-9a-fA-F]{64}$/.test(normalized)) return normalized;
  return ethers.sha256(ethers.toUtf8Bytes(value));
}

function verdictCode(verdict: VerificationResult["verdict"]) {
  if (verdict === "VERIFIED") return 1;
  if (verdict === "REJECTED") return 2;
  return 3;
}

function requiredConfig() {
  const network = selectedNetwork();
  const mainnet = network === "mainnet";
  const contractAddress = mainnet
    ? process.env.ATTESTATIONS_MAINNET_ADDRESS
    : (process.env.ATTESTATIONS_TESTNET_ADDRESS || process.env.ATTESTATIONS_ADDRESS);
  const missing: string[] = [];
  if (!contractAddress) missing.push(mainnet ? "ATTESTATIONS_MAINNET_ADDRESS" : "ATTESTATIONS_TESTNET_ADDRESS");
  if (!process.env.RELAYER_PRIVATE_KEY) missing.push("RELAYER_PRIVATE_KEY");
  if (missing.length) {
    throw new Error("X Layer " + network + " attestation is not configured. Missing: " + missing.join(", "));
  }
  return {
    network,
    rpc: mainnet
      ? (process.env.XLAYER_MAINNET_RPC || "https://rpc.xlayer.tech")
      : (process.env.XLAYER_TESTNET_RPC || "https://testrpc.xlayer.tech/terigon"),
    chainId: mainnet
      ? Number(process.env.XLAYER_MAINNET_CHAIN_ID || 196)
      : Number(process.env.XLAYER_TESTNET_CHAIN_ID || 1952),
    contractAddress: contractAddress!,
    privateKey: process.env.RELAYER_PRIVATE_KEY!,
    explorer: explorerUrlForChain(mainnet ? 196 : 1952),
  };
}

export function xlayerNetwork(): XLayerNetwork {
  return selectedNetwork();
}

export function xlayerConfigured() {
  const mainnet = selectedNetwork() === "mainnet";
  const address = mainnet
    ? process.env.ATTESTATIONS_MAINNET_ADDRESS
    : (process.env.ATTESTATIONS_TESTNET_ADDRESS || process.env.ATTESTATIONS_ADDRESS);
  return Boolean(address && process.env.RELAYER_PRIVATE_KEY);
}

export async function anchorAttestation(input: {
  claimId: string;
  subjectAddress?: string;
  verifierId: string;
  result: VerificationResult;
}) {
  const config = requiredConfig();
  const provider = new ethers.JsonRpcProvider(config.rpc, config.chainId);
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== config.chainId) {
    throw new Error("X Layer RPC chain mismatch: expected " + config.chainId + ", received " + network.chainId);
  }
  const wallet = new ethers.Wallet(config.privateKey, provider);
  const subject = input.subjectAddress || process.env.ATTESTATION_SUBJECT_ADDRESS || wallet.address;
  if (!ethers.isAddress(subject) || subject === ethers.ZeroAddress) {
    throw new Error("ATTESTATION_SUBJECT_ADDRESS must be a valid non-zero wallet address");
  }
  const contract = new ethers.Contract(config.contractAddress, ABI, wallet);
  const claimHash = ethers.id(input.claimId);
  const evidenceHash = asBytes32(input.result.evidenceHash);
  const resultHash = asBytes32(input.result.resultHash);
  const policyHash = ethers.sha256(ethers.toUtf8Bytes(input.result.policyId + "@" + input.result.policyVersion));
  const verifierHash = ethers.id(input.verifierId);
  const expirySeconds = Math.max(0, Number(process.env.ATTESTATION_EXPIRY_SECONDS || 0));
  const expiresAt = expirySeconds ? Math.floor(Date.now() / 1000) + expirySeconds : 0;
  const transaction = await contract.anchor(
    claimHash,
    subject,
    evidenceHash,
    resultHash,
    policyHash,
    verifierHash,
    input.result.confidence,
    verdictCode(input.result.verdict),
    expiresAt,
  );
  const receipt = await transaction.wait();
  if (!receipt || receipt.status !== 1) throw new Error("X Layer attestation transaction was not confirmed");
  return {
    chainId: config.chainId,
    contractAddress: config.contractAddress,
    transactionHash: receipt.hash,
    explorerUrl: config.explorer + "/tx/" + receipt.hash,
    claimHash,
    policyHash,
    verifierHash,
    subjectAddress: subject,
  };
}
