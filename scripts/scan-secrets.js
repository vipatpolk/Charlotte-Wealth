#!/usr/bin/env node

/**
 * Charlotte Wealth - Secret Scanner for CI/CD and Local Verification
 * Scans code, configuration, and template files for leaked credentials or API keys.
 */

const fs = require('fs');
const path = require('path');

const EXCLUDE_DIRS = new Set([
  'node_modules',
  'dist',
  'target',
  'www',
  '.angular',
  '.git',
  '.system_generated',
  '.appium',
  '.gradle',
  'DerivedData',
  'build',
  'assets'
]);

const EXCLUDE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.ico',
  '.svg',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.lock',
  '.tsbuildinfo'
]);

const SECRET_PATTERNS = [
  /['"`=]([0-9a-f]{32,64})['"`\s]?/i,
  /x-api-key['"]?\s*[:=]\s*['"`]([A-Za-z0-9_\-\.]{8,})['"`]/i,
  /(?:api[_-]?key|apikey|secret|token)\s*[:=]\s*['"`]?([A-Za-z0-9_\-\.]{16,})['"`]?/i
];

const results = [];

function scanDir(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return;
  }

  for (const entry of entries) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);

    // Skip Capacitor generated web asset copies (identical to excluded apps/mobile/www)
    if (
      fullPath.includes(path.join('apps', 'mobile', 'android', 'app', 'src', 'main', 'assets')) ||
      fullPath.includes(path.join('apps', 'mobile', 'ios', 'App', 'App', 'public'))
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile()) {
      // Ignore local secret files explicitly git-ignored
      if (entry.name === '.env' || entry.name.endsWith('.env.local')) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (EXCLUDE_EXTENSIONS.has(ext)) continue;

      scanFile(fullPath);
    }
  }
}

function scanFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return;
  }

  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const pattern of SECRET_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        const matchedStr = match[1] || match[0];
        // Whitelist safe test placeholders and process.env references
        if (
          matchedStr === 'invalid-token-key-12345' ||
          matchedStr.includes('process.env') ||
          matchedStr.startsWith('00000000') ||
          matchedStr.includes('dev-') ||
          matchedStr.includes('your-') ||
          matchedStr.includes('placeholder') ||
          matchedStr.includes('example') ||
          matchedStr.includes('dummy')
        ) {
          continue;
        }

        results.push({
          file: filePath,
          line: index + 1,
          snippet: line.trim()
        });
        break;
      }
    }
  });
}

console.log('🔍 Scanning repository for hardcoded secrets...');
scanDir('.');

if (results.length > 0) {
  console.error(`\n❌ SECURITY ALERT: Found ${results.length} potential hardcoded secret(s):`);
  results.forEach((item, idx) => {
    console.error(`  ${idx + 1}. ${item.file}:${item.line}`);
    console.error(`     Snippet: ${item.snippet.substring(0, 100)}`);
  });
  console.error('\nRemediation: Move credentials to .env or secret managers and use process.env.\n');
  process.exit(1);
} else {
  console.log('✅ Clean: No hardcoded secrets detected.');
  process.exit(0);
}
