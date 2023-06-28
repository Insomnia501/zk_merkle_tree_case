# Sample Zero Knowledge Merkle Tree Proof Case

This project demonstrates a basic ZK-based MerkleTree use case. It comes with a circuit and smart contract, a test for that contract, and a script that test that contract.

Try running some of the following tasks:

### Circuit

The merkle tree circuit is `circuits/merkle_tree/merkle_tree.circom`, and here's some related scripts:
```shell
cd circuits
// compile circom
circom ./merkle_tree/merkle_tree.circom --sym --wasm --r1cs -o ./build
// gen zkey
snarkjs plonk setup build/merkle_tree.r1cs build/pot16_final.ptau build/merkle_tree.zkey
// gen verifier sol
snarkjs zkey export solidityverifier build/merkle_tree.zkey ../contracts/Verifier.sol
```

A test script(`test/test.ts`) to verify a address is in the set of merkle leave nodes.
Each leave node is hash(secret, address), and we use '123' as secret.
```shell
npx hardhat test
```
