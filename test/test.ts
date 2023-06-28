import { expect} from "chai";
import { ethers } from "hardhat";
import {calculateMerkleProof} from "../utils/utils";

describe("Verify contract", function() {
  it("prove the item is in the merkle set", async function() {
    // a test address which is in the test address set
    const mainAddr = "0xF02e86D9E0eFd57aD034FaF52201B79917fE0713";
    // to generate the merkle tree and to prove the item is in the merkle tree
    const [proof, root] = await calculateMerkleProof(mainAddr);

    const Verifier = await ethers.getContractFactory("PlonkVerifier");
    const hardhatVerifier = await Verifier.deploy();

    const ZKMerkleTree = await ethers.getContractFactory("ZKMerkleTree");
    const hardhatZKMT = await ZKMerkleTree.deploy(hardhatVerifier, root);

    const verifyResult = await hardhatZKMT.verify(proof);
    expect(verifyResult).to.equal(true);
  });
});
