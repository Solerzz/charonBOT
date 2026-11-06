import { z } from 'zod';

const postgresUrl = z
  .string()
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === 'postgres:' || protocol === 'postgresql:';
  });

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().regex(/^\d{17,20}$/),
  DATABASE_URL: postgresUrl,
  DIRECT_URL: postgresUrl,
});

export interface AppConfig {
  readonly nodeEnv: 'development' | 'test' | 'production';
  readonly logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  readonly discord: {
    readonly token: string;
    readonly clientId: string;
  };
  readonly database: {
    readonly url: string;
    readonly directUrl: string;
  };
}

export function loadConfig(environment: NodeJS.ProcessEnv): AppConfig {
  const result = environmentSchema.safeParse(environment);

  if (!result.success) {
    const fields = [
      ...new Set(
        result.error.issues.map((issue) => issue.path.join('.') || 'environment'),
      ),
    ];

    throw new Error(`Invalid environment configuration: ${fields.join(', ')}`);
  }

  return {
    nodeEnv: result.data.NODE_ENV,
    logLevel: result.data.LOG_LEVEL,
    discord: {
      token: result.data.DISCORD_TOKEN,
      clientId: result.data.DISCORD_CLIENT_ID,
    },
    database: {
      url: result.data.DATABASE_URL,
      directUrl: result.data.DIRECT_URL,
    },
  };
}
