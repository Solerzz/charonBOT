import { describe, expect, it } from 'vitest';

import { Routes } from 'discord.js';

import type { AppConfig } from '../../../src/core/config/env.js';
import { setupCommandData } from '../../../src/modules/setup/setup.command.js';
import {
  commandDefinitions,
  registerCommands,
  type CommandRegistrar,
} from '../../../scripts/register-commands.js';

const config: AppConfig = {
  nodeEnv: 'test',
  logLevel: 'silent',
  discord: { token: 'discord-token', clientId: '123456789012345678' },
  database: {
    url: 'postgresql://charon:secret@pool.example.com:6543/charon',
    directUrl: 'postgresql://charon:secret@db.example.com:5432/charon',
  },
};

describe('commandDefinitions', () => {
  it('contains exactly status and standalone setup definitions', () => {
    expect(commandDefinitions).toEqual([
      expect.objectContaining({
        name: 'status',
        description: 'Mostra o estado atual do Charon.',
      }),
      setupCommandData.toJSON(),
    ]);
    expect(commandDefinitions.map(({ name }) => name)).toEqual(['status', 'setup']);
  });

  it('registers definitions globally for the configured application', async () => {
    let token = '';
    let request: { route: string; body: unknown } | undefined;
    const registrar: CommandRegistrar = {
      setToken(value) {
        token = value;
        return this;
      },
      async put(route, options) {
        request = { route, body: options.body };
        return undefined;
      },
    };

    await registerCommands(config, registrar);

    expect(token).toBe('discord-token');
    expect(request).toEqual({
      route: Routes.applicationCommands('123456789012345678'),
      body: commandDefinitions,
    });
  });
});
