// Remote images blocked: the body route says whether blocking applies to the message at all
// (remoteImagesBlocked), not only whether it found something to block (hasBlockedRemoteImages),
// so the email frame can forbid remote loads outright behind the rewriting.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/db.js', () => ({ query: vi.fn() }));
vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req, _res, next) => { req.session = { userId: 'user-1' }; next(); },
}));
vi.mock('../index.js', () => ({ imapManager: { fetchMessageBody: vi.fn(), prefetchFolderBodies: vi.fn(), noteUserActivity: vi.fn() } }));

import express from 'express';
import mailRoutes from './mail.js';
import { query } from '../services/db.js';
import { imapManager } from '../index.js';

const MSG_ID = '4d479e4f-9b21-4013-9c07-3fbc35f275b1';
const PIXEL = '<p>Hi</p><img src="//tracker.example/p.gif" width="1" height="1">';
// Nothing cached (no HTML and no text) sends the route to the mail server.
const row = (body_html, preferences = {}) => ({
  id: MSG_ID, account_id: 'acct-1', uid: 42, folder: 'INBOX', body_html,
  body_text: body_html ? 'Hi' : null, preferences, from_email: 's@sender.example',
});

describe('GET /messages/:id/body and blocked remote images', () => {
  let server, base;
  beforeAll(async () => {
    await new Promise(resolve => { server = express().use('/api/mail', mailRoutes).listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(async () => { await new Promise(resolve => server.close(resolve)); });
  beforeEach(() => { query.mockReset(); imapManager.fetchMessageBody.mockReset(); });

  const get = async (query = '') => (await fetch(`${base}/api/mail/messages/${MSG_ID}/body${query}`)).json();

  it('blocks a protocol-relative tracking pixel in a cached body and says so', async () => {
    query.mockResolvedValue({ rows: [row(PIXEL)] });
    const body = await get();
    expect(body.html).not.toContain('tracker.example');
    expect(body.hasBlockedRemoteImages).toBe(true);
    expect(body.remoteImagesBlocked).toBe(true);
  });

  it('blocks it in a body fetched from the server too', async () => {
    query.mockResolvedValue({ rows: [row(null)] });
    imapManager.fetchMessageBody.mockResolvedValue({ html: PIXEL, text: 'Hi', attachments: [] });
    const body = await get();
    expect(body.html).not.toContain('tracker.example');
    expect(body.remoteImagesBlocked).toBe(true);
  });

  it('reports blocking even when nothing remote was found', async () => {
    query.mockResolvedValue({ rows: [row('<p>Plain</p>')] });
    const body = await get();
    expect(body.hasBlockedRemoteImages).toBe(false);
    expect(body.remoteImagesBlocked).toBe(true);
  });

  it('does not report blocking when images were asked for, allowed, or from an allowed sender', async () => {
    query.mockResolvedValue({ rows: [row(PIXEL)] });
    expect((await get('?remoteImages=1')).remoteImagesBlocked).toBe(false);
    query.mockResolvedValue({ rows: [row(PIXEL, { blockRemoteImages: false })] });
    expect((await get()).remoteImagesBlocked).toBe(false);
    query.mockResolvedValue({ rows: [row(PIXEL, { imageWhitelist: { domains: ['sender.example'] } })] });
    const allowed = await get();
    expect(allowed.remoteImagesBlocked).toBe(false);
    expect(allowed.html).toContain('//tracker.example/p.gif');
  });
});
