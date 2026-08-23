import test from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractLinks, isRemoteUrl, checkLink } from '../src/checker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('isRemoteUrl validation', () => {
  assert.strictEqual(isRemoteUrl('https://google.com'), true);
  assert.strictEqual(isRemoteUrl('http://localhost:3000'), true);
  assert.strictEqual(isRemoteUrl('./relative/path.md'), false);
  assert.strictEqual(isRemoteUrl('/absolute/path.md'), false);
  assert.strictEqual(isRemoteUrl('mailto:test@example.com'), false);
});

test('extractLinks parses markdown correctly', () => {
  const content = `
# Title
Here is a [Google Link](https://google.com) and some text.
Multiple links: [GitHub](https://github.com) and [Local file](docs/readme.md) on same line.
Ignore text without markdown link.
  `;

  const links = extractLinks(content);
  assert.strictEqual(links.length, 3);
  
  assert.deepStrictEqual(links[0], {
    text: 'Google Link',
    target: 'https://google.com',
    line: 3
  });

  assert.deepStrictEqual(links[1], {
    text: 'GitHub',
    target: 'https://github.com',
    line: 4
  });

  assert.deepStrictEqual(links[2], {
    text: 'Local file',
    target: 'docs/readme.md',
    line: 4
  });
});

test('checkLink validates local file links', async () => {
  // Test with an existing file (this test file itself)
  const fileDir = __dirname;
  const targetFile = 'checker.test.js';
  
  const result = await checkLink(targetFile, fileDir);
  assert.strictEqual(result.success, true);

  // Test with non-existing file
  const nonExistingFile = 'does_not_exist.md';
  const resultFail = await checkLink(nonExistingFile, fileDir);
  assert.strictEqual(resultFail.success, false);
  assert.strictEqual(resultFail.error, 'File or directory does not exist');
});

test('checkLink ignores mailto/tel protocols', async () => {
  const fileDir = __dirname;
  
  const mailResult = await checkLink('mailto:test@example.com', fileDir);
  assert.strictEqual(mailResult.success, true);

  const telResult = await checkLink('tel:+1234567890', fileDir);
  assert.strictEqual(telResult.success, true);
});
