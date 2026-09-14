import { buildApp } from './app.js';

const port = readPort(process.env.PORT);
const host = process.env.HOST ?? '0.0.0.0';
const app = await buildApp({ logger: true });

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}

function readPort(value: string | undefined): number {
  const port = Number(value ?? '3000');

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`PORT must be an integer between 1 and 65535. Received '${value ?? ''}'.`);
  }

  return port;
}
