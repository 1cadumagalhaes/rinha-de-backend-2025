#!/usr/bin/env node
const fs = require('fs/promises');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const PARTICIPANTES = path.join(BASE, 'participantes');
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || null;
const USER_AGENT = 'rinha-tech-scanner/1.0';

function log(...args) { console.log(...args); }

async function readdirDirs(p) {
  const entries = await fs.readdir(p, { withFileTypes: true });
  return entries.filter(e => e.isDirectory()).map(d => d.name);
}

function pickFirstValidGitHubUrl(value) {
  if (!value) return null;
  if (Array.isArray(value)) {
    for (const v of value) {
      const got = pickFirstValidGitHubUrl(v);
      if (got) return got;
    }
    return null;
  }
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (!s) return null;
  // Accept GitHub urls like https://github.com/owner/repo and variants
  const m = s.match(/github\.com[:/]+([^/\s]+)\/([^/\s]+)(?:$|\/|\.git)/i);
  if (!m) return null;
  const owner = m[1];
  let repo = m[2];
  // remove .git or extra fragments
  repo = repo.replace(/\.git$/i, '');
  return { owner, repo };
}

async function ghFetch(url) {
  const headers = { 'User-Agent': USER_AGENT, Accept: 'application/vnd.github.v3+json' };
  if (GITHUB_TOKEN) headers.Authorization = `token ${GITHUB_TOKEN}`;
  const res = await fetch(url, { headers });
  if (res.status === 404) return { status: 404 };
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`GitHub API error ${res.status} for ${url}: ${text}`);
    err.status = res.status;
    throw err;
  }
  const json = await res.json().catch(() => null);
  return { status: res.status, json, headers: res.headers };
}

function parseLinkHeader(link) {
  if (!link) return null;
  // Link: <url?page=2>; rel="next", <url?page=34>; rel="last"
  const parts = link.split(',').map(p => p.trim());
  const map = {};
  for (const p of parts) {
    const m = p.match(/<(.*?)>;\s*rel=\"(.*?)\"/);
    if (m) map[m[2]] = m[1];
  }
  return map;
}

function getQueryParamNumber(url, param = 'page') {
  try {
    const u = new URL(url);
    const v = u.searchParams.get(param);
    return v ? Number(v) : null;
  } catch (e) {
    return null;
  }
}

async function analyzeRepo(owner, repo) {
  const base = `https://api.github.com/repos/${owner}/${repo}`;
  // repo metadata
  const repoRes = await ghFetch(base).catch(err => ({ err }));
  if (repoRes && repoRes.err) throw repoRes.err;
  if (repoRes.status === 404) return { error: 'repo_not_found' };
  const repoJson = repoRes.json;
  const default_branch = repoJson.default_branch || 'main';

  // languages
  const langRes = await ghFetch(`${base}/languages`);
  const languages = langRes.status === 200 ? langRes.json : null;

  // commits: we'll request per_page=1 to use link header to get count and first commit
  const commitsUrl = `${base}/commits?per_page=1&sha=${encodeURIComponent(default_branch)}`;
  const commitsRes = await ghFetch(commitsUrl);
  if (commitsRes.status === 404) return { error: 'commits_not_accessible' };
  const commitsJson = commitsRes.json || [];
  let commitsCount = null;
  let lastCommitDate = null;
  let firstCommitDate = null;

  // last commit is the first item returned
  if (Array.isArray(commitsJson) && commitsJson.length > 0) {
    lastCommitDate = commitsJson[0].commit && commitsJson[0].commit.author && commitsJson[0].commit.author.date || null;
  }
  const link = commitsRes.headers && commitsRes.headers.get('link');
  const parsed = parseLinkHeader(link);
  if (parsed && parsed.last) {
    const lastPage = getQueryParamNumber(parsed.last, 'page');
    commitsCount = lastPage;
    // fetch first commit from last page
    const firstRes = await ghFetch(`${base}/commits?per_page=1&page=${lastPage}&sha=${encodeURIComponent(default_branch)}`);
    const firstJson = firstRes.json || [];
    if (Array.isArray(firstJson) && firstJson.length > 0) {
      firstCommitDate = firstJson[0].commit && firstJson[0].commit.author && firstJson[0].commit.author.date || null;
    }
  } else {
    // no link header, number of commits is commitsJson.length (0 or 1)
    commitsCount = Array.isArray(commitsJson) ? commitsJson.length : null;
    if (commitsCount === 1 && !firstCommitDate) firstCommitDate = lastCommitDate;
  }

  // tree (list files) - use git trees recursive on default branch
  const treeRes = await ghFetch(`${base}/git/trees/${encodeURIComponent(default_branch)}?recursive=1`).catch(err => ({ err }));
  let files = null;
  if (treeRes && treeRes.err) {
    // attempt with branch commit sha retrieved from branch
    try {
      const branchRes = await ghFetch(`${base}/branches/${encodeURIComponent(default_branch)}`);
      if (branchRes.status === 200 && branchRes.json && branchRes.json.commit && branchRes.json.commit.commit) {
        const sha = branchRes.json.commit.sha;
        const treeRes2 = await ghFetch(`${base}/git/trees/${sha}?recursive=1`);
        if (treeRes2.status === 200) files = (treeRes2.json.tree || []).map(t => t.path);
      }
    } catch (e) {
      // ignore
    }
  } else if (treeRes.status === 200) {
    files = (treeRes.json.tree || []).map(t => t.path);
  }

  const relevant = [];
  if (files) {
    const candidates = ['package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'requirements.txt', 'pyproject.toml', 'Pipfile', 'poetry.lock', 'go.mod', 'Cargo.toml', 'build.gradle', 'pom.xml', 'composer.json', 'Dockerfile', '*.csproj', '*.sln'];
    for (const f of files) {
      const baseName = path.basename(f);
      for (const c of candidates) {
        if (c.includes('*')) {
          const pattern = c.replace('*', '');
          if (baseName.endsWith(pattern)) relevant.push(f);
        } else if (baseName.toLowerCase() === c.toLowerCase()) {
          relevant.push(f);
        }
      }
    }
  }

  return {
    repo: `${owner}/${repo}`,
    default_branch,
    languages,
    commits_count: commitsCount,
    first_commit_date: firstCommitDate,
    last_commit_date: lastCommitDate,
    relevant_files: relevant
  };
}

function cleanProvided(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      const s = v.trim();
      if (s) out[k] = s;
    } else if (Array.isArray(v)) {
      const arr = v.map(x => (typeof x === 'string' ? x.trim() : x)).filter(x => x !== '' && x !== null && x !== undefined);
      if (arr.length === 1) out[k] = arr; else if (arr.length > 0) out[k] = arr;
    } else if (v && typeof v === 'object') {
      out[k] = cleanProvided(v);
    } else if (v !== '' && v !== null && v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}

async function processParticipant(dir) {
  const infoPath = path.join(PARTICIPANTES, dir, 'info.json');
  const outPath = path.join(PARTICIPANTES, dir, 'submission.json');
  const result = { participant: dir, detected: {}, provided: null, note: null };
  try {
    const raw = await fs.readFile(infoPath, 'utf8');
    let info;
    try {
      info = JSON.parse(raw);
    } catch (e) {
      result.note = 'invalid_info_json';
      await fs.writeFile(outPath, JSON.stringify(result, null, 2), 'utf8');
      return result;
    }
    result.provided = cleanProvided(info);
    // pick common keys that might hold repo url
    const candidates = ['source-code-repo', 'repo_url', 'repo_url(s)', 'repo', 'source', 'source_repo', 'repo_url_list'];
    let repoCandidate = null;
    for (const k of candidates) {
      if (k in info) {
        repoCandidate = info[k];
        break;
      }
    }
    // also try keys with common names like 'repo_url' or 'repo_url(s)'
    if (!repoCandidate) {
      for (const [k, v] of Object.entries(info)) {
        if (k.toLowerCase().includes('repo') || k.toLowerCase().includes('source')) {
          repoCandidate = v; break;
        }
      }
    }

    const gh = pickFirstValidGitHubUrl(repoCandidate);
    if (!gh) {
      result.note = 'no_github_repo_found';
      await fs.writeFile(outPath, JSON.stringify(result, null, 2), 'utf8');
      return result;
    }

    try {
      const repoData = await analyzeRepo(gh.owner, gh.repo);
      result.detected = repoData;
    } catch (err) {
      result.note = `error_fetching_repo: ${err && err.message}`;
    }

    await fs.writeFile(outPath, JSON.stringify(result, null, 2), 'utf8');
    return result;
  } catch (e) {
    // info.json missing
    result.note = 'info_json_missing';
    await fs.writeFile(outPath, JSON.stringify(result, null, 2), 'utf8');
    return result;
  }
}

async function main() {
  log('Scanning participantes directory:', PARTICIPANTES);
  const dirs = await readdirDirs(PARTICIPANTES);
  log(`Found ${dirs.length} participant directories`);
  for (const d of dirs) {
    try {
      const res = await processParticipant(d);
      log(d, '->', res.note || (res.detected && res.detected.repo) || 'ok');
    } catch (e) {
      console.error('Error processing', d, e && e.message);
    }
  }
  log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
