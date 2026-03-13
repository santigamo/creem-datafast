import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true,
  entry: {
    client: "src/client.ts",
    express: "src/express.ts",
    "idempotency/upstash": "src/idempotency/upstash.ts",
    index: "src/index.ts",
    next: "src/next.ts"
  },
  format: ["esm"],
  sourcemap: true,
  target: "node18"
});
