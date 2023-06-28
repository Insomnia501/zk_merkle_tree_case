import { MerkleTree } from './MerkleTree';
import {poseidon2} from './Poseidon';
import * as fs from 'fs';

const snarkjs = require('snarkjs');

const addrCollection = [
  "0xdb5485C85Bd95f38f9def0cA85499eF67dC581c0",
  "0xDBfD76AF2157Dc15eE4e57F3f942bB45Ba84aF24",
  "0xe2A83b15FC300D8457eB9E176f98d92a8FF40a49",
  "0x08c1AE7E46D4A13b766566033b5C47c735e19F6f",
  "0x98E711f31E49C2e50C1A290b6F2b1e493E43EA76",
  "0xf090Eb4c2B63e7B26E8Bb09e6Fc0cC3A7586263B",
  "0xF02e86D9E0eFd57aD034FaF52201B79917fE0713",
  "0xd99cEbf3C817D7360F46ED055194034d63C255E3"
]

const wasmFilePath = "./circuits/build/merkle_tree_js/merkle_tree.wasm";
const zkeyFilePath = "./circuits/build/merkle_tree.zkey";
// from msg.sender, but other address can be used
const address = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

/*
  Calculate the merkle proof for a given address, to prove this address belongs to the address set
  1. generate the merkle tree by addrCollection
  2. generate the merkle path by merkle tree and mainAddr
  3. generate the proof calldata
 */
export async function calculateMerkleProof(mainAddr: string) {
  // the merkle tree leaves
  const mtLeaves: BigInt[] = [];
  for (let i = 0; i < addrCollection.length; i++) {
    const addrHash = await poseidon2(BigInt(addrCollection[i]), BigInt(123));
    mtLeaves.push(addrHash);
  }
  // create the merkle tree
  const mt = await MerkleTree.createFromLeaves(mtLeaves);
  const preTime = new Date().getTime();
  const [proof, root_val] = await generateMerkleProofCallData(mt, BigInt(mainAddr), address);
  const elapsed = new Date().getTime() - preTime;
  console.log(`Time to compute proof: ${elapsed}ms`);
  return [proof, root_val];
}

/*
  Generate the merkle proof call data
  1. generate the merkle circuit input json
  2. generate the proof, using snarkjs, using plonk
  3. generate the proof call data
  */
async function generateMerkleProofCallData(
  merkleTree: MerkleTree,
  mainAddr: BigInt,
  receiverAddr: string,
): Promise<[string, BigInt]> {
  const inputs = await generateMerkleCircuitInputJson(
    merkleTree,
    mainAddr,
    BigInt(receiverAddr)
  );
  const { proof, publicSignals } = await snarkjs.plonk.fullProve(
    inputs,
    wasmFilePath,
    zkeyFilePath
  );
  const proofProcessed = unstringifyBigInts(proof);
  const pubProcessed = unstringifyBigInts(publicSignals);
  const allSolCallData: string = await snarkjs.plonk.exportSolidityCallData(
    proofProcessed,
    pubProcessed
  );
  const solCallDataProof = allSolCallData.split(',')[0];
  return [solCallDataProof, inputs['root']];
}

interface MerkleCircuitInput {
  root: BigInt;
  publicKey: BigInt;
  secret: BigInt;
  pathIndices: number[];
  pathElements: BigInt[];
  recipient: BigInt;
}

async function generateMerkleCircuitInputJson(
  mt: MerkleTree,
  mainAddrBi: BigInt,
  receiverAddr: BigInt
): Promise<MerkleCircuitInput> {
  const secret = BigInt(123);
  //这个commitment只是用来计算merkle path，实际电路中是会做poseidon，这里注意不要重复做
  const commitment = await poseidon2(mainAddrBi, secret);
  const mp = mt.getMerkleProof(commitment);
  const inputObj = {
    root: mt.root.val,
    publicKey: mainAddrBi,
    secret,
    pathIndices: mp.indices,
    pathElements: mp.vals,
    recipient: receiverAddr,
  };
  return inputObj;
}

// Lifted from ffutils: https://github.com/iden3/ffjavascript/blob/master/src/utils_bigint.js
function unstringifyBigInts(o: any): any {
  if (typeof o === 'string' && /^[0-9]+$/.test(o)) {
    return BigInt(o);
  }
  if (typeof o === 'string' && /^0x[0-9a-fA-F]+$/.test(o)) {
    return BigInt(o);
  }
  if (Array.isArray(o)) {
    return o.map(unstringifyBigInts);
  }
  if (typeof o === 'object') {
    const res: { [key: string]: any } = {};
    const keys = Object.keys(o);
    keys.forEach((k) => {
      res[k] = unstringifyBigInts(o[k]);
    });
    return res;
  }
  return o;
}
