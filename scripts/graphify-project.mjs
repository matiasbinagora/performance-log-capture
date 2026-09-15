#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";

const OUTPUT_DIR = "graphify-out";
const CONTEXT_INDEX = "context-index.json";
const MAX_FILE_BYTES = 1024 * 1024;
const GRAPHIFY_BIN = process.env.GRAPHIFY_BIN || "graphify";

const EXCLUDED_DIRS = new Set([".git", ".worktrees", "node_modules", "dist", "coverage", "test-results", OUTPUT_DIR]);
const EXCLUDED_NAMES = [/^\.env(?:\..*)?$/i, /(?:secret|credential|token|password|private[-_]?key)/i];
const INCLUDED_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".jsonl", ".yaml", ".yml", ".toml", ".sql",
  ".md", ".txt", ".rst", ".css", ".html", ".sh", ".dockerfile", ".conf", ".schema",
]);
const INCLUDED_NAMES = new Set(["AGENTS.md", "Dockerfile", ".gitignore"]);

function fail(message, code = 1) {
  console.error(`[graphify] ${message}`);
  process.exitCode = code;
}

function graphifyVersion() {
  const result = spawnSync(GRAPHIFY_BIN, ["--version"], { encoding: "utf8" });
  if (result.status !== 0) return null;
  return result.stdout.trim() || "unknown";
}

function isExcluded(name) {
  return EXCLUDED_NAMES.some((pattern) => pattern.test(name));
}

function shouldIndex(path) {
  const name = basename(path);
  return INCLUDED_NAMES.has(name) || INCLUDED_EXTENSIONS.has(extname(name).toLowerCase());
}

function collectFiles(root) {
  const files = [];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (EXCLUDED_DIRS.has(entry.name) || isExcluded(entry.name)) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(path);
      } else if (entry.isFile() && shouldIndex(path) && statSync(path).size <= MAX_FILE_BYTES) {
        files.push(path);
      }
    }
  }
  visit(root);
  return files;
}

function category(path) {
  const rel = path.toLowerCase();
  if (rel.includes("openspec")) return "openspec";
  if (rel.includes("fixture") || rel.includes("runs/")) return "fixture";
  if (basename(path).toLowerCase().startsWith("agents")) return "agent-instructions";
  if ([".md", ".txt", ".rst"].includes(extname(path).toLowerCase())) return "documentation";
  if ([".json", ".jsonl", ".yaml", ".yml", ".toml", ".schema", ".sql"].includes(extname(path).toLowerCase())) return "schema-or-config";
  return "source";
}

function buildContextIndex(root) {
  const files = collectFiles(root).map((path) => {
    const content = readFileSync(path, "utf8");
    return {
      path: relative(root, path),
      category: category(path),
      sha256: createHash("sha256").update(content).digest("hex"),
      lines: content.split(/\r?\n/).length,
      content,
    };
  });
  const output = join(root, OUTPUT_DIR);
  mkdirSync(output, { recursive: true });
  writeFileSync(join(output, CONTEXT_INDEX), `${JSON.stringify({ version: 1, files }, null, 2)}\n`);
  return files;
}

function build(root) {
  const version = graphifyVersion();
  if (!version) {
    fail(`Graphify is unavailable (expected '${GRAPHIFY_BIN}' on PATH). code evidence unavailable`, 2);
    return;
  }
  const result = spawnSync(GRAPHIFY_BIN, ["extract", ".", "--code-only", "--no-cluster", "--out", "."], {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
  });
  process.stdout.write(result.stdout || "");
  process.stderr.write(result.stderr || "");
  if (result.status !== 0 || !existsSync(join(root, OUTPUT_DIR, "graph.json"))) {
    fail(`Graphify could not build the deterministic code graph (exit ${result.status ?? "unknown"}). code evidence unavailable`, 2);
    return;
  }
  const files = buildContextIndex(root);
  console.log(`[graphify] context index updated: ${files.length} protected project files`);
  console.log(`[graphify] graph: ${join(OUTPUT_DIR, "graph.json")}`);
  console.log(`[graphify] context search index: ${join(OUTPUT_DIR, CONTEXT_INDEX)}`);
  console.log(`[graphify] version: ${version}`);
}

function loadIndex(root) {
  const path = join(root, OUTPUT_DIR, CONTEXT_INDEX);
  if (!existsSync(path)) {
    fail(`index is missing at ${path}; run 'npm run graphify:index' first`, 2);
    return null;
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

function search(root, query) {
  const index = loadIndex(root);
  if (!index) return;
  if (!graphifyVersion()) {
    fail(`Graphify is unavailable (expected '${GRAPHIFY_BIN}' on PATH). code evidence unavailable`, 2);
    return;
  }
  const graph = join(root, OUTPUT_DIR, "graph.json");
  if (!existsSync(graph)) {
    fail(`Graphify graph is missing at ${graph}; run 'npm run graphify:index' first`, 2);
    return;
  }
  const terms = query.toLowerCase().split(/[^a-z0-9_/-]+/).filter(Boolean);
  if (!terms.length) return fail("search query must contain at least one word");
  const matches = index.files.map((file) => {
    const lower = file.content.toLowerCase();
    const score = terms.reduce((total, term) => total + (lower.includes(term) ? 1 : 0), 0);
    const line = terms.map((term) => lower.indexOf(term)).filter((value) => value >= 0).sort((a, b) => a - b)[0];
    const lineNumber = line === undefined ? 1 : file.content.slice(0, line).split(/\r?\n/).length;
    return { file, score, lineNumber };
  }).filter((match) => match.score > 0).sort((a, b) => b.score - a.score || a.file.path.localeCompare(b.file.path));
  console.log(`Query: ${query}`);
  console.log(`Graphify graph: ${graph}`);
  console.log(`Context matches: ${matches.length}`);
  for (const { file, score, lineNumber } of matches.slice(0, 10)) {
    const excerpt = file.content.split(/\r?\n/)[lineNumber - 1]?.trim().slice(0, 180) || "";
    console.log(`- [${file.category}] ${file.path}:${lineNumber} (terms=${score}) ${excerpt}`);
  }
  const graphResult = spawnSync(GRAPHIFY_BIN, ["query", query, "--graph", graph], { cwd: root, encoding: "utf8" });
  if (graphResult.status === 0) {
    console.log("\nGraphify structural query:");
    process.stdout.write(graphResult.stdout);
  } else {
    console.error("\n[graphify] structural query unavailable; deterministic context matches remain available");
  }
}

function inspect(root) {
  const index = loadIndex(root);
  if (!index) return;
  const graphPath = join(root, OUTPUT_DIR, "graph.json");
  if (!existsSync(graphPath)) return fail(`Graphify graph is missing at ${graphPath}; run 'npm run graphify:index' first`, 2);
  const graph = JSON.parse(readFileSync(graphPath, "utf8"));
  console.log(JSON.stringify({
    graphifyVersion: graphifyVersion(),
    graph: { path: relative(root, graphPath), nodes: graph.nodes?.length ?? 0, edges: graph.edges?.length ?? 0 },
    context: { path: relative(root, join(root, OUTPUT_DIR, CONTEXT_INDEX)), files: index.files.length, byCategory: index.files.reduce((counts, file) => ({ ...counts, [file.category]: (counts[file.category] || 0) + 1 }), {}) },
    excluded: [...EXCLUDED_DIRS, ".env files", "secret-like filenames", "files larger than 1 MiB", "unsupported/binary files"],
  }, null, 2));
}

const [command, ...args] = process.argv.slice(2);
const root = resolve(process.env.GRAPHIFY_ROOT || ".");
if (!existsSync(root)) fail(`project root does not exist: ${root}`);
else if (command === "index") build(root);
else if (command === "search") search(root, args.join(" "));
else if (command === "inspect") inspect(root);
else fail("usage: graphify-project.mjs index | search <query> | inspect");
