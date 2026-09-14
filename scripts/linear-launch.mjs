import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawn } from 'node:child_process';
const roles = {
  orchestrator:['LINEAR_API_KEY_ORCHESTRATOR','matiasnj+orquestrator@gmail.com'],
  developer:['LINEAR_API_KEY_DEVELOPER','matiasnj+developer@gmail.com'],
  qa:['LINEAR_API_KEY_QA','matiasnj+qa@gmail.com'],
};
const role = process.argv[2];
if (!roles[role]) throw new Error('Unknown Linear role');
const env = parseEnv(readFileSync(new URL('../.env', import.meta.url),'utf8'));
const [key,email] = roles[role];
if (!env[key]) throw new Error(`Missing ${key}`);
const child = spawn('docker', ['run','--rm','-i','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges',
  '-e','LINEAR_API_KEY','-e','LINEAR_EXPECTED_EMAIL','-e','LINEAR_ROLE','performance-log-linear:local'], {
  stdio:'inherit',env:{...process.env,LINEAR_API_KEY:env[key],LINEAR_EXPECTED_EMAIL:email,LINEAR_ROLE:role},
});
child.on('error',()=>{console.error('Cannot start Docker Linear bridge');process.exit(1);});
child.on('exit',code=>process.exit(code ?? 1));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>child.kill(signal));
