#!/usr/bin/env node
/**
 * Build Performance Analysis Script
 * Tracks build times, bundle sizes, and dependency metrics
 *
 * Usage:
 *   node analyze-build.js
 *
 * Run this before and after optimizations to measure impact
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RESULTS_FILE = 'build-metrics.json';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function getDirectorySize(dir) {
  try {
    const result = execSync(`du -sb ${dir} 2>/dev/null || echo "0"`, { encoding: 'utf8' });
    return parseInt(result.split('\t')[0]) || 0;
  } catch {
    return 0;
  }
}

function analyzeBuildDirectory() {
  const buildDir = path.join(__dirname, 'build');

  if (!fs.existsSync(buildDir)) {
    log('⚠️  Build directory not found. Run `npm run build` first.', 'yellow');
    return null;
  }

  const staticDir = path.join(buildDir, 'static');
  const jsDir = path.join(staticDir, 'js');
  const cssDir = path.join(staticDir, 'css');

  const analysis = {
    totalSize: getDirectorySize(buildDir),
    staticSize: getDirectorySize(staticDir),
    jsSize: getDirectorySize(jsDir),
    cssSize: getDirectorySize(cssDir),
    fileCount: 0,
    largestFiles: [],
  };

  // Find largest files
  try {
    const files = execSync(
      `find ${buildDir} -type f -exec ls -l {} \\; | sort -k5 -rn | head -10`,
      { encoding: 'utf8' }
    );

    analysis.largestFiles = files.split('\n')
      .filter(line => line.trim())
      .slice(0, 10)
      .map(line => {
        const parts = line.trim().split(/\s+/);
        const size = parseInt(parts[4]);
        const file = parts.slice(8).join(' ').replace(buildDir + '/', '');
        return { file, size };
      });
  } catch {}

  // Count files
  try {
    const count = execSync(`find ${buildDir} -type f | wc -l`, { encoding: 'utf8' });
    analysis.fileCount = parseInt(count.trim());
  } catch {}

  return analysis;
}

function analyzePackages() {
  const packageLock = path.join(__dirname, 'package-lock.json');
  const nodeModules = path.join(__dirname, 'node_modules');

  const analysis = {
    nodeModulesSize: getDirectorySize(nodeModules),
    packageCount: 0,
    lockFileSize: 0,
  };

  if (fs.existsSync(packageLock)) {
    const stats = fs.statSync(packageLock);
    analysis.lockFileSize = stats.size;

    try {
      const lockData = JSON.parse(fs.readFileSync(packageLock, 'utf8'));
      analysis.packageCount = Object.keys(lockData.packages || {}).length;
    } catch {}
  }

  return analysis;
}

function compareWithPrevious(current) {
  if (!fs.existsSync(RESULTS_FILE)) {
    return null;
  }

  try {
    const previous = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
    const latest = previous[previous.length - 1];

    if (!latest || !latest.build) return null;

    return {
      totalSize: current.build.totalSize - latest.build.totalSize,
      jsSize: current.build.jsSize - latest.build.jsSize,
      nodeModulesSize: current.packages.nodeModulesSize - latest.packages.nodeModulesSize,
    };
  } catch {
    return null;
  }
}

function saveResults(metrics) {
  let history = [];

  if (fs.existsSync(RESULTS_FILE)) {
    try {
      history = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
    } catch {}
  }

  history.push({
    timestamp: new Date().toISOString(),
    ...metrics,
  });

  // Keep last 50 builds
  if (history.length > 50) {
    history = history.slice(-50);
  }

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(history, null, 2));
}

function printReport(metrics, comparison) {
  log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
  log('║         BUILD PERFORMANCE ANALYSIS REPORT              ║', 'cyan');
  log('╚════════════════════════════════════════════════════════╝\n', 'cyan');

  // Build metrics
  if (metrics.build) {
    log('📦 BUILD OUTPUT:', 'bright');
    log(`   Total size:        ${formatBytes(metrics.build.totalSize)}`, 'blue');
    log(`   JavaScript:        ${formatBytes(metrics.build.jsSize)}`, 'blue');
    log(`   CSS:               ${formatBytes(metrics.build.cssSize)}`, 'blue');
    log(`   Files:             ${metrics.build.fileCount}`, 'blue');

    if (comparison) {
      const sizeDiff = comparison.totalSize;
      const symbol = sizeDiff > 0 ? '▲' : '▼';
      const color = sizeDiff > 0 ? 'red' : 'green';
      log(`   Change:            ${symbol} ${formatBytes(Math.abs(sizeDiff))}`, color);
    }

    log('\n📊 LARGEST FILES:', 'bright');
    metrics.build.largestFiles.slice(0, 5).forEach((item, i) => {
      log(`   ${i + 1}. ${formatBytes(item.size).padEnd(10)} ${item.file}`, 'yellow');
    });
  }

  // Package metrics
  if (metrics.packages) {
    log('\n📚 DEPENDENCIES:', 'bright');
    log(`   node_modules:      ${formatBytes(metrics.packages.nodeModulesSize)}`, 'blue');
    log(`   Package count:     ${metrics.packages.packageCount}`, 'blue');
    log(`   package-lock.json: ${formatBytes(metrics.packages.lockFileSize)}`, 'blue');

    if (comparison) {
      const nmDiff = comparison.nodeModulesSize;
      if (nmDiff !== 0) {
        const symbol = nmDiff > 0 ? '▲' : '▼';
        const color = nmDiff > 0 ? 'red' : 'green';
        log(`   Change:            ${symbol} ${formatBytes(Math.abs(nmDiff))}`, color);
      }
    }
  }

  log('\n💡 RECOMMENDATIONS:', 'bright');

  if (metrics.build && metrics.build.jsSize > 2 * 1024 * 1024) {
    log('   • JS bundle is large (>2MB). Consider code splitting.', 'yellow');
  }

  if (metrics.packages && metrics.packages.nodeModulesSize > 500 * 1024 * 1024) {
    log('   • node_modules is large (>500MB). Review dependencies.', 'yellow');
  }

  if (comparison && comparison.totalSize > 100 * 1024) {
    log('   • Build size increased significantly. Review recent changes.', 'yellow');
  }

  log('\n✅ Results saved to build-metrics.json', 'green');
  log('');
}

async function main() {
  log('\n🔍 Analyzing build performance...\n', 'cyan');

  const metrics = {
    build: analyzeBuildDirectory(),
    packages: analyzePackages(),
  };

  const comparison = compareWithPrevious(metrics);

  saveResults(metrics);
  printReport(metrics, comparison);
}

main().catch(error => {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
});
