import { ethers } from "hardhat";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const Registry = await ethers.getContractFactory("VerifierRegistry");
  const registry = await Registry.deploy(deployer.address);
  await registry.waitForDeployment();

  const Attestations = await ethers.getContractFactory("ProofLayerAttestations");
  const attestations = await Attestations.deploy(await registry.getAddress(), deployer.address);
  await attestations.waitForDeployment();

  const verifierId = ethers.id(process.env.VERIFIER_ID || "verifier-groq-qwen3.6-27b");
  await registry.registerVerifier(verifierId, deployer.address, ethers.id("prooflayer-live-v1"), ethers.id(process.env.GROQ_MODEL || "qwen/qwen3.6-27b"));
  const network = await ethers.provider.getNetwork();
  const manifest = {
    chainId: Number(network.chainId),
    network: network.name,
    deployer: deployer.address,
    verifierRegistry: await registry.getAddress(),
    proofLayerAttestations: await attestations.getAddress(),
    verifierId,
    deployedAt: new Date().toISOString(),
  };
  const outputDir = path.resolve("deployments");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, `${manifest.chainId}.json`), JSON.stringify(manifest, null, 2) + "\n");
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
