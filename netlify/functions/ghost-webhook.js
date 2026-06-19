/**
 * netlify/functions/ghost-webhook.js
 *
 * Receives Ghost "post.published" webhooks, validates the HMAC signature,
 * then triggers the GitHub Actions workflow via repository_dispatch.
 *
 * Required environment variables (set in Netlify → Site config → Env vars):
 *   GHOST_WEBHOOK_SECRET   — the secret you set when creating the Ghost webhook
 *   GITHUB_PAT             — a GitHub Personal Access Token with repo/actions:write scope
 *   GITHUB_REPO            — e.g. "varun-heman/v4run-website"
 */

const crypto = require('crypto');
const https  = require('https');

function post(url, data, headers) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const opts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), ...headers },
    };
    const req = https.request(url, opts, res => {
      let out = '';
      res.on('data', c => out += c);
      res.on('end', () => resolve({ status: res.statusCode, body: out }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

exports.handler = async function (event) {
  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const secret = process.env.GHOST_WEBHOOK_SECRET;
  const pat    = process.env.GITHUB_PAT;
  const repo   = process.env.GITHUB_REPO;

  if (!pat || !repo) {
    console.error('Missing GITHUB_PAT or GITHUB_REPO env vars');
    return { statusCode: 500, body: 'Server misconfigured' };
  }

  // Validate Ghost HMAC signature if a secret is configured
  // Ghost sends: X-Ghost-Signature: sha256=<hex>, t=<timestamp>
  if (secret) {
    const sigHeader = event.headers['x-ghost-signature'] || '';
    const match     = sigHeader.match(/sha256=([a-f0-9]+)/);
    if (!match) {
      return { statusCode: 401, body: 'Missing signature' };
    }
    const expected = crypto
      .createHmac('sha256', secret)
      .update(event.body || '')
      .digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(match[1], 'hex'), Buffer.from(expected, 'hex'))) {
      return { statusCode: 401, body: 'Invalid signature' };
    }
  }

  // Check the event type — only act on post events we care about
  // Ghost sends the event type in the X-Ghost-Event header
  const ghostEvent = event.headers['x-ghost-event'] || '';
  const relevantEvents = [
    'post.published',          // new post goes live
    'post.published.edited',   // published post edited (URL, title, tags may change)
    'post.unpublished',        // post moved back to draft (remove from site)
    'post.deleted',            // post permanently deleted
  ];
  if (ghostEvent && !relevantEvents.includes(ghostEvent)) {
    return { statusCode: 200, body: `Ignored event: ${ghostEvent}` };
  }

  // Trigger GitHub Actions workflow
  const dispatchUrl = `https://api.github.com/repos/${repo}/dispatches`;
  const result = await post(
    dispatchUrl,
    { event_type: 'ghost_post_published' },
    {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'v4run-ghost-webhook',
    }
  );

  if (result.status === 204) {
    console.log('GitHub Actions workflow triggered successfully.');
    return { statusCode: 200, body: 'Triggered' };
  } else {
    console.error('GitHub dispatch failed:', result.status, result.body);
    return { statusCode: 502, body: `GitHub dispatch failed: ${result.status}` };
  }
};
