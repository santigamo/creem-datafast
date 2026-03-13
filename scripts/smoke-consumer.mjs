import { cpSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const artifactsDir = path.join(repoRoot, ".artifacts");
const fixtureDir = path.join(repoRoot, "tests", "smoke", "consumer-node");

function run(command, args, cwd) {
  execFileSync(command, args, {
    cwd,
    stdio: "inherit"
  });
}

rmSync(artifactsDir, { force: true, recursive: true });
run("pnpm", ["pack:local"], repoRoot);

const tarballs = readdirSync(artifactsDir)
  .filter((file) => file.endsWith(".tgz"))
  .sort();

if (tarballs.length !== 1) {
  throw new Error(`Expected exactly one tarball in ${artifactsDir}, found ${tarballs.length}.`);
}

const tarballPath = path.join(artifactsDir, tarballs[0]);
const consumerDir = mkdtempSync(path.join(tmpdir(), "creem-datafast-smoke-"));
const workingDir = path.join(consumerDir, "consumer-node");

cpSync(fixtureDir, workingDir, { recursive: true });

try {
  run("pnpm", ["install"], workingDir);
  run("pnpm", ["add", tarballPath], workingDir);
  run("pnpm", ["exec", "tsc", "--noEmit"], workingDir);
  run("node", ["runtime.mjs"], workingDir);
} catch (error) {
  console.error(`Smoke consumer fixture left at ${workingDir}`);
  throw error;
}

rmSync(consumerDir, { force: true, recursive: true });
