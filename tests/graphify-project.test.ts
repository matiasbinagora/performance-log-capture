import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const script = join(root, "scripts/graphify-project.mjs");
type ContextIndex = { files: Array<{ path: string }> };

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
    const second = readFileSync(index, "utf8");
    expect(run("index").status).toBe(0);
    expect(readFileSync(index, "utf8")).toBe(second);
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
