const connection = (imap_host, smtp_host, smtp_port = 465) => ({
  imap_host, imap_port: 993, imap_tls: true, imap_skip_tls_verify: false,
  smtp_host, smtp_port, smtp_tls: smtp_port === 465 ? 'SSL' : 'STARTTLS',
});

// Microsoft is deliberately absent: password presets must not bypass OAuth.
export const MAIL_PRESETS = {
  qq: { label: 'QQ / Foxmail', domains: ['qq.com', 'foxmail.com'], hint: 'authorizationCodeHint', connection: connection('imap.qq.com', 'smtp.qq.com') },
  netease163: { label: '网易 163', domains: ['163.com'], hint: 'authorizationCodeHint', connection: connection('imap.163.com', 'smtp.163.com') },
  netease126: { label: '网易 126', domains: ['126.com'], hint: 'authorizationCodeHint', connection: connection('imap.126.com', 'smtp.126.com') },
  neteaseYeah: { label: '网易 Yeah', domains: ['yeah.net'], hint: 'authorizationCodeHint', connection: connection('imap.yeah.net', 'smtp.yeah.net') },
  exmail: { label: '腾讯企业邮箱', hint: 'enterpriseHint', connection: connection('imap.exmail.qq.com', 'smtp.exmail.qq.com') },
  gmail: { label: 'Gmail', domains: ['gmail.com', 'googlemail.com'], hint: 'appPasswordHint', connection: connection('imap.gmail.com', 'smtp.gmail.com', 587) },
  yahoo: { label: 'Yahoo', domains: ['yahoo.com'], hint: 'appPasswordHint', connection: connection('imap.mail.yahoo.com', 'smtp.mail.yahoo.com', 587) },
  icloud: { label: 'iCloud', domains: ['icloud.com', 'me.com', 'mac.com'], hint: 'appPasswordHint', connection: connection('imap.mail.me.com', 'smtp.mail.me.com', 587) },
  custom: { label: 'Custom', hint: 'customConnectionHint' },
};

export function detectMailPreset(address) {
  const parts = String(address || '').trim().toLowerCase().split('@');
  if (parts.length !== 2 || !parts[0]) return null;
  return Object.entries(MAIL_PRESETS).find(([, p]) => p.domains?.includes(parts[1]))?.[0] || null;
}

export function applyMailPreset(form, key) {
  const config = MAIL_PRESETS[key]?.connection;
  if (!config) return { ...form };
  return { ...form, ...config, auth_user: form.auth_user || form.email_address.trim() };
}

export function updateAccountEmail(form, address) {
  return { ...form, email_address: address,
    auth_user: !form.auth_user || form.auth_user === form.email_address ? address : form.auth_user };
}
