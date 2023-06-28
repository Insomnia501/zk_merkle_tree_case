export default class TreeNode {
    constructor(
        public val: BigInt, 
        public lChild?: TreeNode, 
        public rChild?: TreeNode, 
        public parent?: TreeNode) {}
}