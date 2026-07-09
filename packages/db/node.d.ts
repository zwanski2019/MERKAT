// Resolution shim for consumers on classic ("Node") moduleResolution, which
// ignores the package `exports` map. Modern resolvers use exports → dist/node.js
// directly; the API (CommonJS/Node10) finds this. Runtime uses exports either way.
export * from "./dist/node.js";
