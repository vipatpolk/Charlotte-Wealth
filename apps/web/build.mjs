import { createRequire } from 'node:module';
import process from 'node:process';

process.env.NG_CLI_ANALYTICS = 'false';
process.env.NG_FORCE_AUTOCOMPLETE = 'false';

const req = createRequire(import.meta.url);
const cli = req('@angular/cli');

console.log('[build.mjs] Starting Angular build...');

cli
  .default({
    cliArgs: ['build', '--progress=false'],
  })
  .then((exitCode) => {
    console.log(`[build.mjs] Angular build completed successfully with code ${exitCode ?? 0}`);
    process.exit(exitCode ?? 0);
  })
  .catch((err) => {
    console.error('[build.mjs] Angular build encountered an error:', err);
    process.exit(1);
  });
