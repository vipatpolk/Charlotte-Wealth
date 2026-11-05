import { createRequire } from 'node:module';
import process from 'node:process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

// Force single-thread / disable Atomics deadlock on Linux CI/container
process.env.PISCINA_DISABLE_ATOMICS = '1';
process.env.NG_BUILD_MAX_WORKERS = '1';
process.env.NG_BUILD_PARALLEL_TS = 'false';
process.env.NG_CLI_ANALYTICS = 'false';
process.env.NG_FORCE_AUTOCOMPLETE = 'false';
process.env.CI = 'true';

console.log(`[build.mjs] Node: ${process.version}, Platform: ${process.platform} (${process.arch}), CPUs: ${os.cpus().length}`);

// Ensure esbuild binary has executable permissions on Linux
if (process.platform === 'linux') {
  const possiblePaths = [
    path.resolve('node_modules/@esbuild/linux-x64/bin/esbuild'),
    path.resolve('node_modules/@esbuild/linux-arm64/bin/esbuild'),
    path.resolve('../../node_modules/@esbuild/linux-x64/bin/esbuild'),
    path.resolve('../../node_modules/@esbuild/linux-arm64/bin/esbuild'),
    path.resolve('node_modules/esbuild/bin/esbuild'),
    path.resolve('../../node_modules/esbuild/bin/esbuild'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        fs.chmodSync(p, 0o755);
        console.log(`[build.mjs] chmod 755 applied to ${p}`);
      } catch (err) {
        console.warn(`[build.mjs] Failed to chmod ${p}:`, err.message);
      }
    }
  }
}

const req = createRequire(import.meta.url);
const cli = req('@angular/cli');

console.log('[build.mjs] Invoking Angular CLI build (--verbose)...');

cli
  .default({
    cliArgs: ['build', '--progress=false', '--verbose'],
  })
  .then((exitCode) => {
    console.log(`[build.mjs] Angular build completed successfully with code ${exitCode ?? 0}`);
    process.exit(exitCode ?? 0);
  })
  .catch((err) => {
    console.error('[build.mjs] Angular build encountered an error:', err);
    process.exit(1);
  });
