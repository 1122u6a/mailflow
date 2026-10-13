import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createConfiguration, configureFile } from './configure.mjs';

test('configuration generates distinct secrets and rejects invalid environment inputs', () => {
  const first = createConfiguration('mail.example.com', 'admin@example.com');
  const second = createConfiguration('mail.example.com', 'admin@example.com');
  assert.match(first, /^APP_URL=https:\/\/mail.example.com\n/);
  assert.match(first, /ENCRYPTION_KEY=[a-f0-9]{64}\n/);
  assert.notEqual(first, second);
  for (const host of ['https://mail.example.com', 'mail.example.com\nENCRYPTION_KEY=bad', '127.0.0.1', '-bad.example.com']) {
    assert.throws(() => createConfiguration(host, 'admin@example.com'));
  }
  assert.throws(() => createConfiguration('mail.example.com', 'admin@example.com\nBAD=1'));
});

test('configuration cannot overwrite existing encryption keys and is owner-readable only', () => {
  const folder = mkdtempSync(join(tmpdir(), 'mailflow-team-'));
  const path = join(folder, '.env');
  try {
    configureFile(path, 'mail.example.com', 'admin@example.com');
    const contents = readFileSync(path, 'utf8');
    assert.throws(() => configureFile(path, 'mail.example.com', 'admin@example.com'), { code: 'EEXIST' });
    assert.equal(readFileSync(path, 'utf8'), contents);
    if (process.platform !== 'win32') assert.equal(statSync(path).mode & 0o777, 0o600);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
