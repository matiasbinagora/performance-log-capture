import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
<<<<<<< HEAD

const root = process.cwd();
const script = join(root, "scripts/graphify-project.mjs");
type ContextIndex = { files: Array<{ path: string }> };
const unsafePathPatterns = [/\/Users\//, /\/private\//, /\/var\//, /\$HOME(?:\/|$)/, /[A-Za-z]:[\\/]/, /\.\.\//];

function run(command: string, cwd = root, env: NodeJS.ProcessEnv = {}) {
  return spawnSync(process.execPath, [script, ...command.split(" ")], { cwd, env: { ...process.env, ...env }, encoding: "utf8" });
}

describe("Graphify project integration", () => {
  it("builds a repeatable protected context index when Graphify is available", () => {
    const result = run("index");
    if (result.status !== 0 && result.stderr.includes("Graphify is unavailable")) return;
    expect(result.status).toBe(0);
    const index = join(root, "graphify-out/context-index.json");
    expect(existsSync(index)).toBe(true);
    const parsed = JSON.parse(readFileSync(index, "utf8")) as ContextIndex;
    expect(parsed.files.some((file: { path: string }) => file.path === "AGENTS.md")).toBe(true);
    expect(parsed.files.some((file: { path: string }) => file.path.includes("openspec/"))).toBe(true);
    expect(parsed.files.every((file: { path: string }) => !file.path.includes(".env"))).toBe(true);
    expect(parsed.files.every((file: { path: string }) => !unsafePathPatterns.some((pattern) => pattern.test(file.path)))).toBe(true);
    const second = readFileSync(index, "utf8");
    expect(run("index").status).toBe(0);
    expect(readFileSync(index, "utf8")).toBe(second);
  });

  it("sanitizes absolute, traversal, secret, and host-like content before writing or searching", () => {
    const fixture = mkdtempSync(join(tmpdir(), "graphify-safe-"));
    const fakeGraphify = join(fixture, "fake-graphify");
    try {
      mkdirSync(join(fixture, ".codex/agents"), { recursive: true });
      mkdirSync(join(fixture, "openspec/changes"), { recursive: true });
      const fixtureSecret = ["not", "a-real-key"].join("-");
      const protectedValue = ["should", "not-be-indexed"].join("-");
      writeFileSync(join(fixture, ".codex/agents/config.toml"), `args = ["/Users/alice/project/scripts/launch.mjs"]\nremote = "https://private.example.test/api"\napi_key = "${fixtureSecret}"\n`);
      writeFileSync(join(fixture, "openspec/changes/tasks.md"), "Search acceptance criteria\n");
      writeFileSync(join(fixture, "src.ts"), "const outside = /private/other-machine/file; const extless = /srv/app/config /mnt/build/output /opt/service/data; const traversal = ../outside;\n");
      writeFileSync(join(fixture, "routes.ts"), "GET /products/:id GET /api/users GET /health https://example.test/api/users src/app.ts\n");
      writeFileSync(join(fixture, ".env"), `API_KEY=${protectedValue}\n`);
      writeFileSync(join(fixture, "client-secret.ts"), `PRIVATE_KEY=${protectedValue}\n`);
      writeFileSync(fakeGraphify, "#!/bin/sh\nif [ \"$1\" = \"--version\" ]; then echo 0.0-test; exit 0; fi\nmkdir -p graphify-out\nprintf '{\"nodes\":[],\"edges\":[]}' > graphify-out/graph.json\n");
      chmodSync(fakeGraphify, 0o755);
      const env = { GRAPHIFY_BIN: fakeGraphify };
      const indexed = run("index", fixture, env);
      expect(indexed.status).toBe(0);
      const index = JSON.parse(readFileSync(join(fixture, "graphify-out/context-index.json"), "utf8")) as ContextIndex & { diagnostics: unknown[]; files: Array<{ path: string; content: string }> };
      expect(index.files.map((file) => file.path)).toEqual([".codex/agents/config.toml", "openspec/changes/tasks.md", "routes.ts", "src.ts"]);
      const serialized = JSON.stringify(index);
      expect(serialized).toContain("/products/:id");
      expect(serialized).toContain("/api/users");
      expect(serialized).toContain("/health");
||||||| 74c2dfa
=======
import { isLikelyRouteToken, sanitizeContent, sanitizeStructuredValue } from "../scripts/graphify-project.mjs";

const root = process.cwd();
const script = join(root, "scripts/graphify-project.mjs");
type ContextIndex = { files: Array<{ path: string }> };
const unsafePathPatterns = [/\/Users\//, /\/private\//, /\/var\//, /\$HOME(?:\/|$)/, /[A-Za-z]:[\\/]/, /\.\.\//];

function run(command: string, cwd = root, env: NodeJS.ProcessEnv = {}) {
  return spawnSync(process.execPath, [script, ...command.split(" ")], { cwd, env: { ...process.env, ...env }, encoding: "utf8" });
}

describe("Graphify project integration", () => {
  it("classifies route provenance without weakening absolute-path protection", () => {
    const routeContent = [
      "GET /products/:id",
      "/products/:id",
      "GET /api/users",
      "/api/users",
      "/health",
      "/metrics",
      "/files/{id}",
      "/assets/*",
      "/assets/**",
      "https://example.com/api/users",
      "src/app.ts",
    ].join(" ");
    const sanitized = sanitizeContent(routeContent, root);
    expect(sanitized).toContain("GET /products/:id");
    expect(sanitized).toContain("/products/:id");
    expect(sanitized).toContain("GET /api/users");
    expect(sanitized).toContain("/api/users");
    expect(sanitized).toContain("/health");
    expect(sanitized).toContain("/metrics");
    expect(sanitized).toContain("/files/{id}");
    expect(sanitized).toContain("/assets/*");
    expect(sanitized).toContain("/assets/**");
    expect(sanitized).toContain("https://example.com/api/users");
    expect(sanitized).toContain("src/app.ts");
    expect(sanitized).not.toContain("/srv/app/config");
    expect(sanitized).not.toContain("/mnt/build/output");
    expect(sanitized).not.toContain("/opt/service/data");
    expect(isLikelyRouteToken("/products/:id")).toBe(true);
    expect(isLikelyRouteToken("/assets/**")).toBe(true);
    expect(isLikelyRouteToken("/srv/app/config")).toBe(false);
    expect(sanitizeStructuredValue("/products/:id", "route", root)).toBe("/products/:id");
  });

  it("builds a repeatable protected context index when Graphify is available", () => {
    const result = run("index");
    if (result.status !== 0 && result.stderr.includes("Graphify is unavailable")) return;
    expect(result.status).toBe(0);
    const index = join(root, "graphify-out/context-index.json");
    expect(existsSync(index)).toBe(true);
    const parsed = JSON.parse(readFileSync(index, "utf8")) as ContextIndex;
    expect(parsed.files.some((file: { path: string }) => file.path === "AGENTS.md")).toBe(true);
    expect(parsed.files.some((file: { path: string }) => file.path.includes("openspec/"))).toBe(true);
    expect(parsed.files.every((file: { path: string }) => !file.path.includes(".env"))).toBe(true);
    expect(parsed.files.every((file: { path: string }) => !unsafePathPatterns.some((pattern) => pattern.test(file.path)))).toBe(true);
    const second = readFileSync(index, "utf8");
    expect(run("index").status).toBe(0);
    expect(readFileSync(index, "utf8")).toBe(second);
  });

  it("sanitizes absolute, traversal, secret, and host-like content before writing or searching", () => {
    const fixture = mkdtempSync(join(tmpdir(), "graphify-safe-"));
    const fakeGraphify = join(fixture, "fake-graphify");
    try {
      mkdirSync(join(fixture, ".codex/agents"), { recursive: true });
      mkdirSync(join(fixture, "openspec/changes"), { recursive: true });
      const fixtureSecret = ["not", "a-real-key"].join("-");
      const protectedValue = ["should", "not-be-indexed"].join("-");
      writeFileSync(join(fixture, ".codex/agents/config.toml"), `args = ["/Users/alice/project/scripts/launch.mjs"]\nremote = "https://private.example.test/api"\napi_key = "${fixtureSecret}"\n`);
      writeFileSync(join(fixture, "openspec/changes/tasks.md"), "Search acceptance criteria\n");
      writeFileSync(join(fixture, "src.ts"), "const outside = /private/other-machine/file; const extless = /srv/app/config /mnt/build/output /opt/service/data; const traversal = ../outside;\n");
      writeFileSync(join(fixture, "routes.ts"), "GET /products/:id /products/:id GET /api/users /api/users /health /metrics /files/{id} /assets/* https://example.test/api/users src/app.ts\n");
      writeFileSync(join(fixture, ".env"), `API_KEY=${protectedValue}\n`);
      writeFileSync(join(fixture, "client-secret.ts"), `PRIVATE_KEY=${protectedValue}\n`);
      writeFileSync(fakeGraphify, "#!/bin/sh\nif [ \"$1\" = \"--version\" ]; then echo 0.0-test; exit 0; fi\nmkdir -p graphify-out\nprintf '{\"nodes\":[],\"edges\":[]}' > graphify-out/graph.json\n");
      chmodSync(fakeGraphify, 0o755);
      const env = { GRAPHIFY_BIN: fakeGraphify };
      const indexed = run("index", fixture, env);
      expect(indexed.status).toBe(0);
      const index = JSON.parse(readFileSync(join(fixture, "graphify-out/context-index.json"), "utf8")) as ContextIndex & { diagnostics: unknown[]; files: Array<{ path: string; content: string }> };
      expect(index.files.map((file) => file.path)).toEqual([".codex/agents/config.toml", "openspec/changes/tasks.md", "routes.ts", "src.ts"]);
      const serialized = JSON.stringify(index);
      expect(serialized).toContain("/products/:id");
      expect(serialized).toContain("/api/users");
      expect(serialized).toContain("/health");
      expect(serialized).toContain("/metrics");
      expect(serialized).toContain("/files/{id}");
      expect(serialized).toContain("/assets/*");
>>>>>>> origin/feature/per-29-graphify-integration
      expect(serialized).toContain("https://example.test/api/users");
      expect(serialized).toContain("src/app.ts");
      expect(serialized).not.toMatch(/\/Users\//);
      expect(serialized).not.toMatch(/\/srv\/|\/mnt\/|\/opt\/|\/private\//);
      expect(serialized).toContain("https://private.example.test/api");
      expect(serialized).not.toContain(protectedValue);
      expect(serialized).not.toContain(fixtureSecret);
      expect(serialized).not.toMatch(/\.\.\//);
      expect(index.diagnostics).toEqual([]);
      const searched = run("search acceptance", fixture, env);
      expect(searched.status).toBe(0);
      expect(searched.stdout).toContain("openspec/changes/tasks.md");
      expect(`${searched.stdout}\n${searched.stderr}`).not.toMatch(/\/Users\/|\/private\/|\/var\/|\$HOME|\.\.\//);
      expect(`${searched.stdout}\n${searched.stderr}`).not.toContain(fixtureSecret);
      expect(`${searched.stdout}\n${searched.stderr}`).not.toContain(protectedValue);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("does not preserve prefix or traversal paths in indexed content", () => {
    const fixture = mkdtempSync(join(tmpdir(), "graphify-boundary-"));
    const fakeGraphify = join(fixture, "fake-graphify");
    try {
      writeFileSync(join(fixture, "boundary.md"), 'inside="/repo/project/src/app.ts" prefix="/repo/project-other/app.ts" traversal="/repo/project/../outside.ts"\n');
      writeFileSync(fakeGraphify, "#!/bin/sh\nif [ \"$1\" = \"--version\" ]; then echo 0.0-test; exit 0; fi\nmkdir -p graphify-out\nprintf '{\"nodes\":[],\"edges\":[]}' > graphify-out/graph.json\n");
      chmodSync(fakeGraphify, 0o755);
      const result = run("index", fixture, { GRAPHIFY_BIN: fakeGraphify });
      expect(result.status).toBe(0);
      const index = readFileSync(join(fixture, "graphify-out/context-index.json"), "utf8");
      expect(index).toContain("[absolute-path-redacted]");
      expect(index).not.toContain("/repo/project");
      expect(index).not.toContain("../");
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("excludes protected paths and keeps generation deterministic", () => {
    const result = run("index");
    if (result.status !== 0 && result.stderr.includes("Graphify is unavailable")) return;
    expect(result.status).toBe(0);
    const index = join(root, "graphify-out/context-index.json");
    const first = readFileSync(index, "utf8");
    const secondResult = run("index");
    expect(secondResult.status).toBe(0);
    expect(readFileSync(index, "utf8")).toBe(first);
    const parsed = JSON.parse(first) as ContextIndex;
    expect(parsed.files.every((file) => !/(^|\/)\.env(?:\.|$)|(^|\/)(?:node_modules|\.git|\.worktrees|graphify-out)(\/|$)|secret|credential|token|password/i.test(file.path))).toBe(true);
  });

  it("searches source and OpenSpec/documentation context", () => {
    const result = run("search search handler intentional delay error");
    if (result.status !== 0 && result.stderr.includes("index is missing")) return;
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("src/api/catalog-routes.ts");
    const docs = run("search OpenSpec acceptance criteria");
    expect(docs.status).toBe(0);
    expect(docs.stdout).toContain("openspec/");
  });

  it("reports missing indexes and unavailable Graphify clearly", () => {
    const fixture = mkdtempSync(join(tmpdir(), "graphify-project-"));
    try {
      writeFileSync(join(fixture, "AGENTS.md"), "safe instructions\n");
      const missing = run("search missing", fixture);
      expect(missing.status).not.toBe(0);
      expect(missing.stderr).toContain("npm run graphify:index");
      const unavailable = run("index", fixture, { GRAPHIFY_BIN: "graphify-command-not-installed" });
      expect(unavailable.status).not.toBe(0);
      expect(unavailable.stderr).toContain("code evidence unavailable");
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
});
