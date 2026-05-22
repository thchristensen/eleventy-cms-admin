exports.handler = async function (event, context) {
  const isLocalDev = process.env.NETLIFY_DEV === 'true';
  const user = context.clientContext?.user;
  if (!isLocalDev && !user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const token  = process.env.GITHUB_TOKEN;
  const owner  = process.env.GITHUB_OWNER;
  const repo   = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!token || !owner || !repo) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing required env vars: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO' }),
    };
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
  const base = `https://api.github.com/repos/${owner}/${repo}/contents`;

  if (event.httpMethod === 'GET') {
    const path = event.queryStringParameters?.path;
    if (!path) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloudName:    process.env.CLOUDINARY_CLOUD_NAME    || '',
          uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || '',
        }),
      };
    }
    const res = await fetch(`${base}/${path}?ref=${branch}`, { headers });
    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(await res.json()),
    };
  }

  if (event.httpMethod === 'DELETE') {
    const { path, message, sha } = JSON.parse(event.body || '{}');
    if (!path || !message || !sha) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields: path, message, sha' }) };
    }
    const payload = { message, sha, branch };
    const res = await fetch(`${base}/${path}`, { method: 'DELETE', headers, body: JSON.stringify(payload) });
    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(await res.json()),
    };
  }

  if (event.httpMethod === 'PUT') {
    const { path, message, content, sha } = JSON.parse(event.body || '{}');
    if (!path || !message || !content) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields: path, message, content' }) };
    }
    const payload = { message, content, branch };
    if (sha) payload.sha = sha;
    const res = await fetch(`${base}/${path}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(await res.json()),
    };
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
};
