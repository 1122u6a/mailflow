import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function createConfiguration(domain, email) {
  if (typeof domain !== 'string' || domain.length > 253 || !domain.includes('.')
      || !domain.split('.').every(part => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(part))
      || /^\d+\.\d+\.\d+\.\d+$/.test(domain)) {
    throw new Error('请填写有效的域名，例如 mail.example.com，不要包含 https:// 或路径。');
  }
  if (typeof email !== 'string' || !/^[^\s@"'#$=]+@[^\s@"'#$=]+\.[^\s@"'#$=]+$/.test(email)) {
    throw new Error('请填写用于 HTTPS 证书通知的有效邮箱地址。');
  }
  return `APP_URL=https://${domain.toLowerCase()}\nDOMAIN=${domain.toLowerCase()}\nACME_EMAIL=${email}\nSESSION_SECRET=${randomBytes(32).toString('hex')}\nDB_PASSWORD=${randomBytes(24).toString('hex')}\nENCRYPTION_KEY=${randomBytes(32).toString('hex')}\nTRUST_PROXY_HOPS=2\n`;
}

export function configureFile(path, domain, email) {
  const contents = createConfiguration(domain, email);
  // Replacing this key on an existing installation makes stored mailbox passwords unreadable.
  writeFileSync(path, contents, { flag: 'wx', mode: 0o600 });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    configureFile('.env', process.argv[2], process.argv[3]);
    console.log('配置已生成。请保管好 .env；请勿提交到 GitHub。');
  } catch (error) {
    console.error(error.code === 'EEXIST' ? '已有 .env，已停止，防止覆盖原有加密密钥。' : error.message);
    process.exitCode = 1;
  }
}
