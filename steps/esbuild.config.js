const esbuild = require("esbuild")

esbuild.build({
    entryPoints: ["src/index.ts"],
    bundle: true,
    platform: "node",
    target: "node20",
    outfile: "dist/index.js",
    external: [],
}).catch((error) => {
    console.error(error)
    process.exit(1)
})