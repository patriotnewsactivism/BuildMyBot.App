#!/usr/bin/env node

/**
 * Simple link checker script
 * Scans the codebase for URLs and verifies they are accessible
 *
 * Usage: node scripts/check-links.js
 */

const fs = require('fs');
const path = require('path');

const EXCLUDED_DIRS = ['node_modules', 'dist', '.git', 'build'];
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g;

const urls = new Set();
let totalFiles = 0;

/**
 * Recursively scan directory for files
 */
function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.includes(entry.name)) {
        scanDirectory(fullPath);
      }
    } else if (entry.isFile()) {
      // Only scan text files
      const ext = path.extname(entry.name);
      if (['.ts', '.tsx', '.js', '.jsx', '.md', '.html', '.css'].includes(ext)) {
        scanFile(fullPath);
      }
    }
  }
}

/**
 * Extract URLs from a file
 */
function scanFile(filePath) {
  totalFiles++;
  const content = fs.readFileSync(filePath, 'utf-8');
  const matches = content.matchAll(URL_REGEX);

  for (const match of matches) {
    const url = match[1];
    // Filter out common placeholder URLs
    if (!url.includes('example.com') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
      urls.add(url);
    }
  }
}

/**
 * Check if URLs are accessible
 */
async function checkUrls() {
  console.log(`\n🔍 Checking ${urls.size} unique URLs found in ${totalFiles} files...\n`);

  const results = {
    total: urls.size,
    accessible: 0,
    broken: 0,
    skipped: 0,
  };

  const brokenLinks = [];

  for (const url of urls) {
    try {
      // Skip non-HTTP URLs
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        results.skipped++;
        continue;
      }

      const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });

      if (response.ok) {
        results.accessible++;
        console.log(`✅ ${url}`);
      } else {
        results.broken++;
        brokenLinks.push({ url, status: response.status });
        console.log(`❌ ${url} (HTTP ${response.status})`);
      }
    } catch (error) {
      results.broken++;
      brokenLinks.push({ url, error: error.message });
      console.log(`❌ ${url} (${error.message})`);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Total URLs: ${results.total}`);
  console.log(`   ✅ Accessible: ${results.accessible}`);
  console.log(`   ❌ Broken: ${results.broken}`);
  console.log(`   ⏭️  Skipped: ${results.skipped}`);

  if (brokenLinks.length > 0) {
    console.log('\n🚨 Broken Links:');
    brokenLinks.forEach(({ url, status, error }) => {
      console.log(`   - ${url}`);
      if (status) console.log(`     Status: ${status}`);
      if (error) console.log(`     Error: ${error}`);
    });

    process.exit(1); // Exit with error code for CI/CD
  } else {
    console.log('\n✨ All links are working!');
    process.exit(0);
  }
}

// Main execution
console.log('🔗 Link Checker for BuildMyBot.App');
console.log('====================================');

const projectRoot = path.join(__dirname, '..');
scanDirectory(projectRoot);

checkUrls().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
