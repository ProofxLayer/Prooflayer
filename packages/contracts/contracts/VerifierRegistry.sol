// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract VerifierRegistry is Ownable {
    struct Verifier {
        address operator;
        bytes32 manifestHash;
        bytes32 versionHash;
        uint64 registeredAt;
        bool active;
    }

    mapping(bytes32 => Verifier) private verifiers;
    mapping(address => bytes32) public verifierForOperator;

    error ZeroVerifierId();
    error ZeroOperator();
    error VerifierAlreadyRegistered(bytes32 verifierId);
    error VerifierNotFound(bytes32 verifierId);
    error OperatorAlreadyAssigned(address operator);
    error NotVerifierOperator(bytes32 verifierId, address operator);

    event VerifierRegistered(bytes32 indexed verifierId, address indexed operator, bytes32 manifestHash, bytes32 versionHash);
    event VerifierStatusChanged(bytes32 indexed verifierId, bool active);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function registerVerifier(
        bytes32 verifierId,
        address operator,
        bytes32 manifestHash,
        bytes32 versionHash
    ) external onlyOwner {
        if (verifierId == bytes32(0)) revert ZeroVerifierId();
        if (operator == address(0)) revert ZeroOperator();
        if (verifiers[verifierId].registeredAt != 0) revert VerifierAlreadyRegistered(verifierId);
        if (verifierForOperator[operator] != bytes32(0)) revert OperatorAlreadyAssigned(operator);

        verifiers[verifierId] = Verifier({
            operator: operator,
            manifestHash: manifestHash,
            versionHash: versionHash,
            registeredAt: uint64(block.timestamp),
            active: true
        });
        verifierForOperator[operator] = verifierId;
        emit VerifierRegistered(verifierId, operator, manifestHash, versionHash);
    }

    function setVerifierActive(bytes32 verifierId, bool active) external onlyOwner {
        Verifier storage verifier = verifiers[verifierId];
        if (verifier.registeredAt == 0) revert VerifierNotFound(verifierId);
        verifier.active = active;
        emit VerifierStatusChanged(verifierId, active);
    }

    function getVerifier(bytes32 verifierId) external view returns (Verifier memory) {
        if (verifiers[verifierId].registeredAt == 0) revert VerifierNotFound(verifierId);
        return verifiers[verifierId];
    }

    function isActiveOperator(bytes32 verifierId, address operator) external view returns (bool) {
        Verifier memory verifier = verifiers[verifierId];
        return verifier.registeredAt != 0 && verifier.active && verifier.operator == operator;
    }
}
