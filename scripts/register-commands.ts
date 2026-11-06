import 'dotenv/config';

import { pathToFileURL } from 'node:url';

import { REST, Routes } from 'discord.js';

import { loadConfig, type AppConfig } from '../src/core/config/env.js';
import { StatusCommand } from '../src/modules/status/status.command.js';
import { setupCommandData } from '../src/modules/setup/setup.command.js';

export interface CommandRegistrar {
  setToken(token: string): CommandRegistrar;
  put(route: string, options: { body: unknown }): Promise<unknown>;
}

export const commandDefinitions = [
  new StatusCommand().data.toJSON(),
  setupCommandData.toJSON(),
];

export async function registerCommands(
  config: AppConfig,
  registrar: CommandRegistrar = new REST({ version: '10' }),
): Promise<void> {
  registrar.setToken(config.discord.token);
  await registrar.put(Routes.applicationCommands(config.discord.clientId), {
    body: commandDefinitions,
  });
}

function isMainModule(): boolean {
  const entrypoint = process.argv[1];
  return entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href;
}

if (isMainModule()) {
  registerCommands(loadConfig(process.env)).catch(() => {
    console.error('Command registration failed.');
    process.exitCode = 1;
  });
}
