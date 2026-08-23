import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Helper to check if a string is a URL
export fn isRemoteUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Extract links from markdown content
// Returns array of { text, target, line }
export fn extractLinks(content) {
  const links = [];
  const lines = content.split('\n');
  
  // Matches [link text](link-target)
  const inlineLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  for (let i = 0; i < lines.length; i++) {
    const lineContent = lines[i];
    let match;
    // Reset regex index for safety
    inlineLinkRegex.lastIndex = 0;
    
    while ((match = inlineLinkRegex.exec(lineContent)) !== null) {
      links.push({
        text: match[1],
        target: match[2],
        line: i + 1
      });
    }
  }
  return links;
}

// Check a single link
// Returns { success: boolean, error?: string }
export async function checkLink(linkTarget, fileDir) {
  if (isRemoteUrl(linkTarget)) {
    try {
      // Use HEAD request to save bandwidth
      const response = await fetch(linkTarget, {
        method: 'HEAD',
        headers: { 'User-Agent': 'md-link-evaluator/1.0.0' },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      // If HEAD is not allowed (e.g. 405 or 403), fallback to GET
      if (response.status === 405 || response.status === 403) {
        const getResponse = await fetch(linkTarget, {
          method: 'GET',
          headers: { 'User-Agent': 'md-link-evaluator/1.0.0' },
          signal: AbortSignal.timeout(5000)
        });
        if (getResponse.ok) return { success: true };
        return { success: false, error: `HTTP Status ${getResponse.status}` };
      }

      if (response.ok) return { success: true };
      return { success: false, error: `HTTP Status ${response.status}` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Handle local links
  if (linkTarget.startsWith('mailto:') || linkTarget.startsWith('tel:')) {
    return { success: true };
  }

  // Handle local anchor links
  if (linkTarget.startsWith('#')) {
    return { success: true }; // Skip deep anchor validation for simplicity
  }

  // Handle local path
  try {
    // Remove query params or hashes from local file links (e.g. file.md#L12)
    const cleanPath = linkTarget.split('#')[0].split('?')[0];
    const resolvedPath = path.resolve(fileDir, decodeURIComponent(cleanPath));
    await fs.stat(resolvedPath);
    return { success: true };
  } catch {
    return { success: false, error: 'File or directory does not exist' };
  }
}

// Recursively find files with .md extension
export async function findMarkdownFiles(dir) {
  const results = [];

  async function walk(currentDir) {
    const list = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of list) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'target') {
          await walk(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(fullPath);
      }
    }
  }

  await walk(dir);
  return results;
}

// Main execution logic
async function main() {
  const args = process.argv.slice(2);
  const targetDir = args[0] ? path.resolve(args[0]) : process.cwd();

  console.log(`Scanning directory: ${targetDir}`);
  
  let files;
  try {
    files = await findMarkdownFiles(targetDir);
  } catch (err) {
    console.error(`Error scanning directory: ${err.message}`);
    process.exit(1);
  }

  console.log(`Found ${files.length} markdown file(s). Checking links...\n`);

  let totalLinks = 0;
  let brokenLinksCount = 0;

  for (const file of files) {
    const relativeFile = path.relative(targetDir, file);
    const content = await fs.readFile(file, 'utf8');
    const fileDir = path.dirname(file);
    const links = extractLinks(content);

    if (links.length === 0) continue;

    totalLinks += links.length;
    console.log(`Checking ${relativeFile} (${links.length} links)...`);

    // Check all links in this file concurrently
    const results = await Promise.all(
      links.map(async (l) => {
        const status = await checkLink(l.target, fileDir);
        return { ...l, ...status };
      })
    );

    const broken = results.filter((r) => !r.success);
    if (broken.length > 0) {
      brokenLinksCount += broken.length;
      console.log(`  ❌ ${broken.length} broken link(s) found:`);
      for (const b of broken) {
        console.log(`    - Line ${b.line}: [${b.text}](${b.target}) -> ${b.error}`);
      }
    } else {
      console.log(`  ✅ All links OK`);
    }
    console.log();
  }

  console.log('------------------------------------------------------------');
  console.log('SCAN SUMMARY');
  console.log('------------------------------------------------------------');
  console.log(`Total files scanned:  ${files.length}`);
  console.log(`Total links checked:  ${totalLinks}`);
  console.log(`Total broken links:   ${brokenLinksCount}`);
  
  if (brokenLinksCount > 0) {
    console.log('------------------------------------------------------------');
    process.exit(1);
  } else {
    console.log('Everything is clean! 🎉');
    console.log('------------------------------------------------------------');
  }
}

// Run main if called directly from CLI
const isDirectRun = process.argv[1] && (
  process.argv[1] === fileURLToPath(import.meta.url) ||
  process.argv[1].endsWith('checker.js') ||
  process.argv[1].endsWith('index.js')
);

if (isDirectRun) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

// End of markdown link checker module
