import { $ } from 'bun';
import { existsSync } from 'fs';
import { rm, mkdir } from 'fs/promises';
import { resolve } from 'path';

const tag = process.argv[2];

if (!tag) {
  console.log('No tag specified. Fetching available tags from GitHub...\n');

  const allTags: string[] = [];
  let url: string | null = 'https://api.github.com/repos/microsoft/TypeScript/tags?per_page=100';

  while (url) {
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Failed to fetch tags from GitHub');
      process.exit(1);
    }

    const tags = await response.json() as Array<{ name: string }>;
    allTags.push(...tags.map(t => t.name));

    // Parse Link header for pagination
    const linkHeader = response.headers.get('link');
    url = null;

    if (linkHeader) {
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      if (nextMatch) {
        url = nextMatch[1];
      }
    }
  }

  console.log('Available tags:');
  for (const t of allTags) {
    console.log(`  - ${t}`);
  }
  console.log(`\nTotal: ${allTags.length} tags`);
  console.log('\nUsage: bun scripts/patch.ts <tag>');
  process.exit(1);
}

const versionsDir = resolve(import.meta.dir, '..', 'versions');
const tagDir = resolve(versionsDir, tag);

console.log(`Patching TypeScript ${tag} ...`);

// Remove existing directory if it exists
if (existsSync(tagDir)) {
  console.log(`Removing existing directory: ${tagDir}`);
  await rm(tagDir, { recursive: true, force: true });
}

// Create versions directory if it doesn't exist
await mkdir(versionsDir, { recursive: true });

// Clone the TypeScript repository (shallow clone, single branch, single commit)
console.log(`Cloning microsoft/TypeScript@${tag} ...`);
await $`git clone --depth 1 --branch ${tag} --single-branch https://github.com/microsoft/TypeScript.git ${tagDir}`;

// Change to the tag directory
const originalCwd = process.cwd();
process.chdir(tagDir);

try {
  // Install dependencies
  console.log('Installing dependencies ...');
  await $`npm install`;

  // Build TypeScript using hereby
  console.log('Building TypeScript with hereby ...');
  await $`npx --yes hereby@latest`;

  console.log(`✓ Successfully patched TypeScript ${tag}`);
} finally {
  // Restore original working directory
  process.chdir(originalCwd);
}
