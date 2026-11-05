import 'dotenv/config';

import { pathToFileURL } from 'node:url';

import {
  createApplication,
  registerShutdownSignals,
  type Application,
} from './application.js';
import { loadConfig } from './core/config/env.js';

export async function start(): Promise<Application> {
  const application = createApplication(loadConfig(process.env));
  registerShutdownSignals(application);
  await application.start();
  return application;
}

function isMainModule(): boolean {
  const entrypoint = process.argv[1];
  return entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href;
}

if (isMainModule()) {
  start().catch(() => {
    console.error('Charon failed to start.');
    process.exitCode = 1;
  });
}
