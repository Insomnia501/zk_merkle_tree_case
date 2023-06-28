import { MerkleProof } from "./MerkleProof";
import { mimcSponge } from "./Mimc";
import TreeNode from "./TreeNode";

/** Merkle tree of MimcSponge hashes */
export class MerkleTree {

    public root: TreeNode;

    public leaves: TreeNode[];

    constructor(linkedRoot: TreeNode, linkedLeaves: TreeNode[]) {
        this.root = linkedRoot;
        this.leaves = linkedLeaves;
    }

    public static async createFromLeaves(leaves: BigInt[]): Promise<MerkleTree> {
        const leafNodes = leaves.map(leaf => new TreeNode(leaf));
        const rootNode = (await MerkleTree.hashChildrenAndLinkToParent(leafNodes))[0];
        return new MerkleTree(rootNode, leafNodes);
    }

    private static async hashChildrenAndLinkToParent(levelLeaves: TreeNode[]): Promise<TreeNode[]> {
        if (levelLeaves.length === 1) return levelLeaves;
        const parents: TreeNode[] = [];
        for (let i = 0; i < levelLeaves.length; i+= 2) {
            const l = levelLeaves[i];
            const r = levelLeaves[i+1];
            // eslint-disable-next-line no-await-in-loop
            const hash = await mimcSponge(l.val, r.val);
            const parent = new TreeNode(hash, l, r);
            parents.push(parent);
            l.parent = parent;
            r.parent = parent;
        }
        return this.hashChildrenAndLinkToParent(parents);
    }

    /** 
     * 
     *  For ("A\nB,C\nD,E,F,G"), return the MerkleTree boject(A).
     * 
     *          A
     *        /   \
     *       B     C
     *      / \   / \
     *     D   E F   G
     * 
     */
    public static createFromStorageString(ss: string): MerkleTree {
        const lines = ss.split("\n");

        const rootNode = new TreeNode(BigInt(lines[0]));
        let currRow: TreeNode[] = [rootNode];
        for (let lineIndex = 1; lineIndex < lines.length; lineIndex+=1) {
            const vals = lines[lineIndex].split(",");

            if (vals.length / 2 !== currRow.length) throw new Error("Malformatted tree.");

            for (let rowIndex = 0; rowIndex < currRow.length; rowIndex+=1) {
                const parent = currRow[rowIndex]
                const lChild = new TreeNode(BigInt(vals[2*rowIndex]), undefined, undefined, parent);
                const rChild = new TreeNode(BigInt(vals[2*rowIndex + 1]), undefined, undefined, parent);
                parent.lChild = lChild;
                parent.rChild = rChild;
            }
            currRow = MerkleTree.getChildRow(currRow);
        }
        return new MerkleTree(rootNode, currRow);
    }

    /**
     * Computes the MerkleProof for a given leafVal in the tree. 
     */
    public getMerkleProof(leafVal: BigInt): MerkleProof {
        let leaf = this.findMatchingLeaf(leafVal);
        const merkleProof: MerkleProof = {
            vals: new Array<BigInt>(), 
            indices: new Array<number>()
        };

        while (leaf.val !== this.root.val) {
            if (leaf.parent!.lChild!.val === leaf.val) { // Right child
                merkleProof.vals.push(leaf.parent!.rChild!.val);
                merkleProof.indices.push(0);
            } else if (leaf.parent!.rChild!.val === leaf.val) { // Left child
                merkleProof.vals.push(leaf.parent!.lChild!.val);
                merkleProof.indices.push(1);
            } else {
                throw new Error("This shouldn't have happened.")
            }
            leaf = leaf.parent!;
        }

        return merkleProof;
    }

    /** 
     *          A
     *        /   \
     *       B     C
     *      / \   / \
     *     D   E F   G
     * 
     *  For tree above we create "A\nB,C\nD,E,F,G".
     */
    public getStorageString(): string {
        let result = "";
        let currRow = [this.root];
        while(currRow.length > 0) {
            for (let i = 0; i < currRow.length; i+=1) {
                result += this.toHex(currRow[i].val);
                if (i !== currRow.length - 1) result += ",";
            }

            currRow = MerkleTree.getChildRow(currRow);
            if (currRow.length !== 0) result += "\n";
        }
        return result;
    }

    // eslint-disable-next-line class-methods-use-this
    private toHex(number: BigInt, length = 32) {
        const str: string = number.toString(16);
        return `0x${str.padStart(length * 2, '0')}`;
    }

    public leafExists(search: BigInt): boolean {
        return this.leaves.find(node => node.val === search) !== undefined
    }

    /** 
     *          A
     *        /   \
     *       B     C
     *      / \   / \
     *     D   E F   G
     * 
     *  getChildRow([B,C]) -> [D,E,F,G]
     */
    private static getChildRow(parentLevel: TreeNode[]): TreeNode[] {
        const children: TreeNode[] = [];
        for (const parent of parentLevel) {
            if (parent.lChild && parent.rChild) {
                children.push(parent.lChild);
                children.push(parent.rChild);
            }
        }
        return children;
    }

    private findMatchingLeaf(leafVal: BigInt): TreeNode {
        const matchingLeaf = this.leaves.find(leaf => leaf.val === leafVal);
        if (matchingLeaf === undefined) {
            throw new  Error("Failed to find leaf.");
        }
        return matchingLeaf!;
    }
}
