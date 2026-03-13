import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const artifactsDir = path.join(repoRoot, ".artifacts");
const fixtureDir = path.join(repoRoot, "tests", "smoke", "consumer-bun");

function run(command, args, cwd) {
  execFileSync(command, args, {
    cwd,
    stdio: "inherit"
  });
}

if (!existsSync(fixtureDir)) {
  throw new Error(`Missing Bun smoke fixture at ${fixtureDir}.`);
}

try {
  execFileSync("bun", ["--version"], { stdio: "ignore" });
} catch {
  throw new Error("Bun is required to run `pnpm smoke:bun`. Install Bun or run this script in CI.");
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
const consumerDir = mkdtempSync(path.join(tmpdir(), "creem-datafast-bun-smoke-"));
const workingDir = path.join(consumerDir, "consumer-bun");

cpSync(fixtureDir, workingDir, { recursive: true });

try {
  run("bun", ["install"], workingDir);
  run("bun", ["add", tarballPath], workingDir);
  run("bun", ["run", "runtime.mjs"], workingDir);
} catch (error) {
  console.error(`Bun smoke consumer fixture left at ${workingDir}`);
  throw error;
}

rmSync(consumerDir, { force: true, recursive: true });
