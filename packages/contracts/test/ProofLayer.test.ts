import { expect } from "chai";
import { ethers } from "hardhat";

describe("ProofLayer contracts", function () {
  async function deployed() {
    const [owner, verifier, stranger, subject] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("VerifierRegistry");
    const registry = await Registry.deploy(owner.address);
    const Attestations = await ethers.getContractFactory("ProofLayerAttestations");
    const attestations: any = await Attestations.deploy(await registry.getAddress(), owner.address);
    const verifierId = ethers.id("prooflayer-fixture-01");
    await registry.registerVerifier(verifierId, verifier.address, ethers.id("manifest"), ethers.id("version"));
    return { owner, verifier, stranger, subject, registry, attestations, verifierId };
  }

  async function claimInputs() {
    return {
      claimId: ethers.id("claim-001"),
      evidenceHash: ethers.id("evidence"),
      resultHash: ethers.id("result"),
      policyHash: ethers.id("solar_installation_completed_v1"),
    };
  }

  it("registers an active verifier and reads it back", async function () {
    const { registry, verifier, verifierId } = await deployed();
    const result = await registry.getVerifier(verifierId);
    expect(result.operator).to.equal(verifier.address);
    expect(result.active).to.equal(true);
    expect(await registry.isActiveOperator(verifierId, verifier.address)).to.equal(true);
  });

  it("anchors a valid attestation and reads it back", async function () {
    const { attestations, verifier, subject, verifierId } = await deployed();
    const input = await claimInputs();
    await attestations.connect(verifier).anchor(input.claimId, subject.address, input.evidenceHash, input.resultHash, input.policyHash, verifierId, 91, 1, 0);
    const result = await attestations.getAttestation(input.claimId);
    expect(result.subject).to.equal(subject.address);
    expect(result.confidence).to.equal(91);
    expect(result.verdict).to.equal(1);
    expect(await attestations.isValid(input.claimId)).to.equal(true);
  });

  it("rejects unknown and inactive verifier operators", async function () {
    const { attestations, registry, stranger, subject, verifierId } = await deployed();
    const input = await claimInputs();
    await expect(attestations.connect(stranger).anchor(input.claimId, subject.address, input.evidenceHash, input.resultHash, input.policyHash, verifierId, 91, 1, 0)).to.be.revertedWithCustomError(attestations, "UnknownOrInactiveVerifier");
    await registry.setVerifierActive(verifierId, false);
    await expect(attestations.connect(stranger).anchor(ethers.id("claim-002"), subject.address, input.evidenceHash, input.resultHash, input.policyHash, verifierId, 91, 1, 0)).to.be.revertedWithCustomError(attestations, "UnknownOrInactiveVerifier");
  });

  it("rejects duplicate claims and invalid confidence", async function () {
    const { attestations, verifier, subject, verifierId } = await deployed();
    const input = await claimInputs();
    await attestations.connect(verifier).anchor(input.claimId, subject.address, input.evidenceHash, input.resultHash, input.policyHash, verifierId, 100, 1, 0);
    await expect(attestations.connect(verifier).anchor(input.claimId, subject.address, input.evidenceHash, input.resultHash, input.policyHash, verifierId, 100, 1, 0)).to.be.revertedWithCustomError(attestations, "AlreadyAnchored");
    await expect(attestations.connect(verifier).anchor(ethers.id("claim-003"), subject.address, input.evidenceHash, input.resultHash, input.policyHash, verifierId, 101, 1, 0)).to.be.revertedWithCustomError(attestations, "InvalidConfidence");
  });

  it("supports revocation, expiry, and pause", async function () {
    const { attestations, verifier, subject, verifierId } = await deployed();
    const input = await claimInputs();
    const expiry = (await ethers.provider.getBlock("latest"))!.timestamp + 60;
    await attestations.connect(verifier).anchor(input.claimId, subject.address, input.evidenceHash, input.resultHash, input.policyHash, verifierId, 90, 1, expiry);
    expect(await attestations.isValid(input.claimId)).to.equal(true);
    await attestations.revoke(input.claimId, "manual review");
    expect(await attestations.isValid(input.claimId)).to.equal(false);
    await attestations.pause();
    await expect(attestations.connect(verifier).anchor(ethers.id("claim-004"), subject.address, input.evidenceHash, input.resultHash, input.policyHash, verifierId, 90, 1, 0)).to.be.revertedWithCustomError(attestations, "ContractPaused");
    await attestations.unpause();
    await attestations.connect(verifier).anchor(ethers.id("claim-004"), subject.address, input.evidenceHash, input.resultHash, input.policyHash, verifierId, 90, 1, 0);
  });
});
