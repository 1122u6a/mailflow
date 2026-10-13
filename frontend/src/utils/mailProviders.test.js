import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAIL_PRESETS, detectMailPreset, applyMailPreset, updateAccountEmail } from './mailProviders.js';

test('consumer domains are detected exactly, and corporate domains remain custom', () => {
  assert.equal(detectMailPreset('  User@QQ.COM  '), 'qq');
  assert.equal(detectMailPreset('user@foxmail.com'), 'qq');
  assert.equal(detectMailPreset('user@163.com'), 'netease163');
  assert.equal(detectMailPreset('user@126.com'), 'netease126');
  assert.equal(detectMailPreset('user@yeah.net'), 'neteaseYeah');
  assert.equal(detectMailPreset('user@company.com'), null);
  assert.equal(detectMailPreset('user@qq.com.attacker.com'), null);
  assert.equal(detectMailPreset('user@outlook.com'), null, 'Microsoft must use the existing OAuth flow');
});

test('switching from SSL SMTP to Gmail also changes encryption, without leaking UI metadata', () => {
  const form = { email_address: 'user@qq.com', auth_user: '', auth_pass: 'keep-this', smtp_tls: 'STARTTLS' };
  const qq = applyMailPreset(form, 'qq');
  assert.equal(qq.smtp_port, 465);
  assert.equal(qq.smtp_tls, 'SSL');
  assert.equal(qq.auth_user, 'user@qq.com');
  assert.equal(qq.auth_pass, 'keep-this');
  assert.equal(qq.imap_skip_tls_verify, false);
  assert.equal(qq.label, undefined);
  assert.equal(qq.domains, undefined);
  const gmail = applyMailPreset(qq, 'gmail');
  assert.equal(gmail.smtp_port, 587);
  assert.equal(gmail.smtp_tls, 'STARTTLS');
  assert.deepEqual(form, { email_address: 'user@qq.com', auth_user: '', auth_pass: 'keep-this', smtp_tls: 'STARTTLS' });
});

test('custom usernames and custom settings survive preset and email edits', () => {
  const form = { email_address: 'old@company.com', auth_user: 'employee-id', imap_host: 'mail.company.com' };
  assert.equal(applyMailPreset(form, 'exmail').auth_user, 'employee-id');
  assert.deepEqual(applyMailPreset(form, 'custom'), form);
  assert.deepEqual(applyMailPreset(form, 'missing'), form);
  assert.equal(updateAccountEmail(form, 'new@company.com').auth_user, 'employee-id');
  assert.equal(updateAccountEmail({ ...form, auth_user: form.email_address }, 'new@company.com').auth_user, 'new@company.com');
});

test('all server presets use encrypted IMAP and the correct SMTP encryption mode', () => {
  for (const preset of Object.values(MAIL_PRESETS)) {
    if (!preset.connection) continue;
    assert.equal(preset.connection.imap_port, 993);
    assert.equal(preset.connection.smtp_tls, preset.connection.smtp_port === 465 ? 'SSL' : 'STARTTLS');
  }
});
