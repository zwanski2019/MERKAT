// Resolution shim (see node.d.ts). Runtime resolves via the `exports` map;
// this exists for classic-resolution consumers.
export * from "./dist/node.js";
