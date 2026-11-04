import * as fs from 'fs';
import * as path from 'path';

export interface Settings {
  environment: string;
  backendApiKey: string;
  allowedOrigins: string[];
  secSubscriptionKey: string;
  googleSpreadsheetId: string;
  googlePvdSpreadsheetId: string;
  secPvdProjId: string;
  secPvdBaseUrl: string;
}

/**
 * Loads environment variables from .env file into process.env if present
 */
function loadEnv(): void {
  const candidatePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'apps/api/.env'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(process.cwd(), '../../.env'),
  ];

  for (const envFile of candidatePaths) {
    if (fs.existsSync(envFile)) {
      try {
        const content = fs.readFileSync(envFile, 'utf8');
        for (const line of content.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed
              .slice(eqIdx + 1)
              .trim()
              .replace(/^['"](.*)['"]$/, '$1');
            if (key && !process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      } catch {
        // Ignore read errors
      }
      break;
    }
  }
}

loadEnv();

export function getSettings(): Settings {
  loadEnv();
  const env = process.env.ENVIRONMENT || 'development';
  const isProd = env === 'production' || process.env.NODE_ENV === 'production';

  return {
    environment: env,
    backendApiKey:
      process.env.BACKEND_API_KEY || (isProd ? '' : 'dev-local-api-key'),
    allowedOrigins: ['http://localhost:4200', 'http://localhost:8100'],
    secSubscriptionKey: process.env.SEC_SUBSCRIPTION_KEY || '',
    googleSpreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || '',
    googlePvdSpreadsheetId: process.env.GOOGLE_PVD_SPREADSHEET_ID || '',
    secPvdProjId: process.env.SEC_PVD_PROJ_ID || 'V0001_2553',
    secPvdBaseUrl:
      process.env.SEC_PVD_BASE_URL || 'https://api.sec.or.th/v1/pvd',
  };
}

export const defaultSettings: Settings = getSettings();
