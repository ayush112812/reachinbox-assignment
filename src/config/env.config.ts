import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:5173'),

  // Elasticsearch
  ELASTICSEARCH_NODE: z.string().default('http://localhost:9200'),
  ELASTICSEARCH_EMAIL_INDEX: z.string().default('reachinbox-emails'),
  ELASTICSEARCH_KNOWLEDGE_INDEX: z.string().default('reachinbox-knowledge'),

  // LLM Providers & Embeddings
  LLM_PROVIDER: z.enum(['gemini', 'openai']).default('gemini'),
  LLM_MODEL: z.string().default('gemini-3.6-flash'),
  GENERATION_MODEL: z.string().optional(),
  EMBEDDING_MODEL: z.string().default('gemini-embedding-001'),
  BOOKING_URL: z.string().default('https://cal.com/example'),
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Notifications (optional for Phase 1)
  SLACK_WEBHOOK_URL: z.string().optional(),
  EXTERNAL_WEBHOOK_URL: z.string().optional(),

  // IMAP Account 1 (optional for Phase 1)
  IMAP_ACC1_ID: z.string().default('account_1'),
  IMAP_ACC1_USER: z.string().optional(),
  IMAP_ACC1_PASS: z.string().optional(),
  IMAP_ACC1_HOST: z.string().optional(),
  IMAP_ACC1_PORT: z.coerce.number().default(993),
  IMAP_ACC1_SECURE: z.coerce.boolean().default(true),

  // IMAP Account 2 (optional for Phase 1)
  IMAP_ACC2_ID: z.string().default('account_2'),
  IMAP_ACC2_USER: z.string().optional(),
  IMAP_ACC2_PASS: z.string().optional(),
  IMAP_ACC2_HOST: z.string().optional(),
  IMAP_ACC2_PORT: z.coerce.number().default(993),
  IMAP_ACC2_SECURE: z.coerce.boolean().default(true),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Environment validation failed:', JSON.stringify(result.error.format(), null, 2));
    throw new Error('Invalid environment configuration');
  }
  return result.data;
};

export const config = parseEnv();
export type Config = z.infer<typeof envSchema>;
