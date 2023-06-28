// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

interface IPlonkVerifier {
    function verifyProof(bytes memory proof, uint[] memory pubSignals) external view returns (bool);
}

/// @title An example utilizing a zk-proof of MerkleTree inclusion.
contract ZKMerkleTree is Ownable {
    IPlonkVerifier immutable verifier;

    uint256 public root;

    constructor(
        IPlonkVerifier _verifier,
        uint256 _root
    ) {
        verifier = _verifier;
        root = _root;
    }

    /// @notice verifies the proof
    function verify(bytes calldata proof) view public returns (bool){
        uint[] memory pubSignals = new uint[](2);
        pubSignals[0] = uint256(root);
        pubSignals[1] = uint256(uint160(msg.sender));
        bool result = verifier.verifyProof(proof, pubSignals);
        if (result){
            console.log("prove success!");
        }
        else{
            console.log("prove failure!");
        }
        return result;
    }
}
