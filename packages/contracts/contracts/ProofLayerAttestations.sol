// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IVerifierRegistry {
    function isActiveOperator(bytes32 verifierId, address operator) external view returns (bool);
}

contract ProofLayerAttestations {
    enum Verdict {
        NONE,
        VERIFIED,
        REJECTED,
        NEEDS_REVIEW
    }

    struct Attestation {
        bytes32 claimId;
        address subject;
        bytes32 evidenceHash;
        bytes32 resultHash;
        bytes32 policyHash;
        bytes32 verifierId;
        uint8 confidence;
        Verdict verdict;
        uint64 createdAt;
        uint64 expiresAt;
        bool revoked;
    }

    IVerifierRegistry public immutable verifierRegistry;
    address public owner;
    bool public paused;
    mapping(bytes32 => Attestation) private attestations;

    error NotOwner();
    error ContractPaused();
    error ZeroClaimId();
    error ZeroSubject();
    error AlreadyAnchored(bytes32 claimId);
    error UnknownOrInactiveVerifier(bytes32 verifierId, address operator);
    error InvalidConfidence(uint8 confidence);
    error InvalidVerdict();
    error AttestationNotFound(bytes32 claimId);
    error AlreadyRevoked(bytes32 claimId);
    error ExpiryBeforeCreation();

    event AttestationAnchored(
        bytes32 indexed claimId,
        address indexed subject,
        bytes32 indexed verifierId,
        bytes32 evidenceHash,
        bytes32 resultHash,
        Verdict verdict,
        uint8 confidence,
        uint64 expiresAt
    );
    event AttestationRevoked(bytes32 indexed claimId, string reason);
    event Paused(address indexed account);
    event Unpaused(address indexed account);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    constructor(address registry, address initialOwner) {
        if (registry == address(0) || initialOwner == address(0)) revert ZeroSubject();
        verifierRegistry = IVerifierRegistry(registry);
        owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroOwner();
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    error ZeroOwner();

    function anchor(
        bytes32 claimId,
        address subject,
        bytes32 evidenceHash,
        bytes32 resultHash,
        bytes32 policyHash,
        bytes32 verifierId,
        uint8 confidence,
        Verdict verdict,
        uint64 expiresAt
    ) external whenNotPaused {
        if (claimId == bytes32(0)) revert ZeroClaimId();
        if (subject == address(0)) revert ZeroSubject();
        if (attestations[claimId].createdAt != 0) revert AlreadyAnchored(claimId);
        if (!verifierRegistry.isActiveOperator(verifierId, msg.sender)) {
            revert UnknownOrInactiveVerifier(verifierId, msg.sender);
        }
        if (confidence > 100) revert InvalidConfidence(confidence);
        if (verdict == Verdict.NONE) revert InvalidVerdict();
        if (expiresAt != 0 && expiresAt < block.timestamp) revert ExpiryBeforeCreation();

        uint64 createdAt = uint64(block.timestamp);
        attestations[claimId] = Attestation({
            claimId: claimId,
            subject: subject,
            evidenceHash: evidenceHash,
            resultHash: resultHash,
            policyHash: policyHash,
            verifierId: verifierId,
            confidence: confidence,
            verdict: verdict,
            createdAt: createdAt,
            expiresAt: expiresAt,
            revoked: false
        });
        emit AttestationAnchored(claimId, subject, verifierId, evidenceHash, resultHash, verdict, confidence, expiresAt);
    }

    function revoke(bytes32 claimId, string calldata reason) external onlyOwner {
        Attestation storage attestation = attestations[claimId];
        if (attestation.createdAt == 0) revert AttestationNotFound(claimId);
        if (attestation.revoked) revert AlreadyRevoked(claimId);
        attestation.revoked = true;
        emit AttestationRevoked(claimId, reason);
    }

    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    function getAttestation(bytes32 claimId) external view returns (Attestation memory) {
        if (attestations[claimId].createdAt == 0) revert AttestationNotFound(claimId);
        return attestations[claimId];
    }

    function isValid(bytes32 claimId) external view returns (bool) {
        Attestation memory attestation = attestations[claimId];
        if (attestation.createdAt == 0 || attestation.revoked) return false;
        return attestation.expiresAt == 0 || attestation.expiresAt >= block.timestamp;
    }
}
