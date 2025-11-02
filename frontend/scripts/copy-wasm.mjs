import fs from "fs";
import path from "path";
import url from "url";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const publicDir = path.join(projectRoot, "public");
const sdkDistDir = path.join(projectRoot, "node_modules", "@zama-fhe", "relayer-sdk", "dist");

const filesToCopy = ["tfhe_bg.wasm", "kms_lib_bg.wasm"];

async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

async function copyFileSafe(src, dest) {
  try {
    await fs.promises.copyFile(src, dest);
    console.log(`[copy-wasm] Copied: ${path.basename(src)} -> ${dest}`);
  } catch (err) {
    console.warn(`[copy-wasm] Skip copying ${src}: ${err.message}`);
  }
}

async function main() {
  try {
    await ensureDir(publicDir);
    for (const filename of filesToCopy) {
      const src = path.join(sdkDistDir, filename);
      const dest = path.join(publicDir, filename);
      await copyFileSafe(src, dest);
    }
  } catch (err) {
    console.warn(`[copy-wasm] Failed: ${err.message}`);
    process.exit(0);
  }
}

await main();


