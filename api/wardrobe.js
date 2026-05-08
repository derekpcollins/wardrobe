// Vercel Serverless Function: /api/wardrobe
// Proxies reads and writes to the GitHub Contents API.
// GITHUB_TOKEN is kept server-side only.

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // e.g. "derekpcollins/wardrobe"
const GITHUB_FILE_PATH = process.env.GITHUB_FILE_PATH || 'wardrobe.json';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

const GITHUB_API_BASE = 'https://api.github.com';

function githubHeaders() {
  return {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'Wardrobe-App/1.0',
  };
}

async function getFile() {
  const url = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}?ref=${GITHUB_BRANCH}`;
  const res = await fetch(url, { headers: githubHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub GET failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  const content = Buffer.from(data.content, 'base64').toString('utf8');
  return { items: JSON.parse(content), sha: data.sha };
}

async function putFile(items, sha, message = 'Update wardrobe.json') {
  const url = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;
  const content = Buffer.from(JSON.stringify(items, null, 2)).toString('base64');
  const body = JSON.stringify({
    message,
    content,
    sha,
    branch: GITHUB_BRANCH,
  });
  const res = await fetch(url, { method: 'PUT', headers: githubHeaders(), body });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub PUT failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return { sha: data.content.sha };
}

export default async function handler(req, res) {
  // CORS headers for browser requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return res.status(500).json({ error: 'Server misconfigured: missing GITHUB_TOKEN or GITHUB_REPO' });
  }

  try {
    if (req.method === 'GET') {
      const { items, sha } = await getFile();
      return res.status(200).json({ items, sha });
    }

    if (req.method === 'PUT') {
      const { items, sha, message } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Body must include an items array' });
      }
      if (!sha) {
        return res.status(400).json({ error: 'Body must include the current file sha' });
      }
      const result = await putFile(items, sha, message || 'Update wardrobe.json');
      return res.status(200).json({ ok: true, sha: result.sha });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[/api/wardrobe]', err);
    return res.status(500).json({ error: err.message });
  }
}
