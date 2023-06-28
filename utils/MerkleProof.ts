export interface MerkleProof {
    vals: BigInt[];
    indices: number[]; // 0 if proofVal on left, 1 if proofVal on right
}