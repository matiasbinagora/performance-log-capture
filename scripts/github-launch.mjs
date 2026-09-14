import crypto from "node:crypto";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const roles = {
  developer: ["GITHUB_APP_ID_DEVELOPER", "GITHUB_APP_INSTALLATION_ID_DEVELOPER", "GITHUB_APP_PRIVATE_KEY_B64_DEVELOPER"],
  reviewer: ["GITHUB_APP_ID_REVIEWER", "GITHUB_APP_INSTALLATION_ID_REVIEWER", "GITHUB_APP_PRIVATE_KEY_B64_REVIEWER"],
  qa: ["GITHUB_APP_ID_QA", "GITHUB_APP_INSTALLATION_ID_QA", "GITHUB_APP_PRIVATE_KEY_B64_QA"],
};
const role = process.argv[2];
if (!roles[role]) throw new Error("Unknown GitHub role");

const root = fileURLToPath(new URL("..", import.meta.url));
const env = Object.fromEntries(fs.readFileSync(new URL("../.env", import.meta.url), "utf8")
  .split(/\r?\n/).filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
  .map((line) => { const i = line.indexOf("="); return [line.slice(0, i), line.slice(i + 1)]; }));
const [appKey, installationKey, privateKeyKey] = roles[role];
const appId = env[appKey];
const installationId = env[installationKey];
const privateKey = Buffer.from(env[privateKeyKey] || "", "base64").toString("utf8");
if (!appId || !installationId || !privateKey.includes("BEGIN")) throw new Error("GitHub App configuration missing");

const b64 = (value) => Buffer.from(value).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const header = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
const payload = b64(JSON.stringify({ iat: now - 60, exp: now + 540, iss: appId }));
const unsigned = `${header}.${payload}`;
const signature = crypto.createSign("RSA-SHA256").update(unsigned).sign(privateKey, "base64url");
const response = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
  method: "POST",
  headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${unsigned}.${signature}`, "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
  body: JSON.stringify({ repositories: ["performance-log-capture"] }),
});
if (!response.ok) throw new Error(`GitHub installation token request failed: HTTP ${response.status}`);
const { token } = await response.json();
const child = spawn("docker", ["run", "--rm", "-i", "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges", "-e", "GITHUB_PERSONAL_ACCESS_TOKEN", "-e", "GITHUB_AGENT_ROLE", "ghcr.io/github/github-mcp-server@sha256:fbec75de11c255213fa08d80fb166abe73d851fff631c51c0079872967720699"], { cwd: root, env: { ...process.env, GITHUB_PERSONAL_ACCESS_TOKEN: token, GITHUB_AGENT_ROLE: role }, stdio: "inherit" });
child.on("error", (error) => { console.error(`GitHub MCP startup failed: ${error.message}`); process.exitCode = 1; });
child.on("exit", (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
