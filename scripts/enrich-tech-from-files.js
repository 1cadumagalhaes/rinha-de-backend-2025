#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const PARTICIPANTES = path.join(REPO_ROOT, 'participantes');
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || null;
const USER_AGENT = 'rinha-tech-enricher/1.0';

function ghHeaders() {
  const h = { 'User-Agent': USER_AGENT, Accept: 'application/vnd.github.v3+json' };
  if (GITHUB_TOKEN) h.Authorization = `token ${GITHUB_TOKEN}`;
  return h;
}

async function ghFetchJson(url) {
  const res = await fetch(url, { headers: ghHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub API ${res.status} ${url}`);
  return res.json();
}

async function ghFetchFile(owner, repo, path_, ref) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path_)}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`;
  const j = await ghFetchJson(url);
  if (!j) return null;
  if (j.type === 'file' && j.content) {
    const buff = Buffer.from(j.content, j.encoding || 'base64');
    return buff.toString('utf8');
  }
  return null;
}

function pickPreferredLanguage(submission) {
  const provided = submission.provided || {};
  const det = submission.detected || {};
  // try provided.langs or provided.lang or provided.langs
  const keys = ['langs', 'lang', 'language', 'languages'];
  for (const k of keys) {
    if (k in provided) {
      const v = provided[k];
      if (typeof v === 'string' && v.trim()) return v.trim().toLowerCase();
      if (Array.isArray(v) && v.length) return String(v[0]).toLowerCase();
    }
  }
  // fallback to detected.languages (object)
  if (det.languages && typeof det.languages === 'object') {
    const entries = Object.entries(det.languages);
    if (entries.length) {
      entries.sort((a, b) => (b[1] || 0) - (a[1] || 0));
      return String(entries[0][0]).toLowerCase();
    }
  }
  return null;
}

function normalizeName(s) {
  return String(s || '').toLowerCase().trim();
}

// classification keywords
const STORAGE_KW = ['redis', 'postgres', 'postgresql', 'mongodb', 'sqlite', 'mysql', 'rocksdb', 'lmdb', 'memcached', 'keydb', 'duckdb', 'file', 'filesystem', 'sqlite3'];
const MESSAGING_KW = ['nats', 'rabbitmq', 'kafka', 'bull', 'bullmq', 'sidekiq', 'sqs', 'nsq', 'zeromq', 'zeromq', 'nres', 'nats-', 'kafka-node', 'redis-streams', 'redis streams', 'channels', 'channel', 'queue'];
const LOAD_BALANCER_KW = ['nginx', 'haproxy', 'traefik', 'caddy', 'envoy', 'openresty'];
const FRAMEWORK_KW = ['express', 'fastify', 'koa', 'spring', 'spring-boot', 'quarkus', 'micronaut', 'tokio', 'actix', 'axum', 'gin', 'fasthttp', 'fiber', 'fastapi', 'flask', 'swoole', 'phoenix', 'nest', 'nestjs', 'bun', 'hono', 'elysia', 'uvicorn', 'starlette', 'drogon', 'echo', 'vapor', 'aspnet', 'asp.net', 'sinatra'];

// blacklist for noisy / dev-only packages we want to ignore
const BLACKLIST_PATTERNS = [
  /^@types\//i,
  /^typescript$/i,
  /^prettier$/i,
  /^eslint(-.*)?$/i,
  /^jest(-.*)?$/i,
  /^mocha$/i,
  /^chai$/i,
  /^babel(-.*)?$/i,
  /^ts-node$/i,
  /^tslib$/i,
  /^webpack(-.*)?$/i,
  /^rollup(-.*)?$/i,
  /^parcel(-.*)?$/i,
  /^husky$/i,
  /^lint-staged$/i
];

// runtime detection hints
const RUNTIME_HINTS = {
  BUN_FILES: ['bun.lockb', 'bun.lock', 'bunfig.toml'],
  GRAAL_KEYWORDS: ['native-image', 'graalvm']
};

function classifyLib(name, out) {
  const n = normalizeName(name);
  if (!n) return;
  // skip blacklisted dev tooling
  for (const re of BLACKLIST_PATTERNS) if (re.test(n)) return;
  for (const s of STORAGE_KW) if (n.includes(s)) { out.storages.add(name); return; }
  for (const s of MESSAGING_KW) if (n.includes(s)) { out.messaging.add(name); return; }
  for (const s of LOAD_BALANCER_KW) if (n.includes(s)) { out.load_balancers.add(name); return; }
  for (const s of FRAMEWORK_KW) if (n.includes(s)) { out.frameworks.add(name); return; }
  // language packages heuristics
  out.libraries.add(name);
}

function parsePackageJson(content, out, hints) {
  try {
    const j = JSON.parse(content);
    const deps = Object.assign({}, j.dependencies || {}, j.devDependencies || {}, j.peerDependencies || {});
    for (const k of Object.keys(deps)) classifyLib(k, out);
    // runtime hints: engines.bun or presence of bun in scripts
    if (hints) {
      if (j.engines && j.engines.bun) hints.runtimes.add('bun');
      if (j.scripts) {
        for (const s of Object.values(j.scripts)) if (typeof s === 'string' && s.toLowerCase().includes('bun')) hints.runtimes.add('bun');
      }
    }
  } catch (e) { }
}

function parseRequirementsTxt(content, out) {
  const lines = content.split(/\r?\n/);
  for (let l of lines) {
    l = l.trim();
    if (!l || l.startsWith('#')) continue;
    // package==version or package>=version
    const name = l.split(/[<=>~\[\]\(]/)[0].trim();
    if (name) classifyLib(name, out);
  }
}

function parsePyprojectToml(content, out) {
  // crude: look for lines under [tool.poetry.dependencies] or [project.dependencies]
  const lines = content.split(/\r?\n/);
  let section = null;
  for (let l of lines) {
    l = l.trim();
    if (!l) continue;
    if (l.startsWith('[')) {
      section = l.toLowerCase();
      continue;
    }
    if (!section) continue;
    if (section.includes('dependencies') || section.includes('tool.poetry.dependencies')) {
      // skip python version like python = "^3.11"
      if (l.includes('=')) {
        const name = l.split('=')[0].trim().replace(/['\"]+/g, '');
        if (name && name.toLowerCase() !== 'python') classifyLib(name, out);
      }
    }
  }
}

function parseGoMod(content, out, hints) {
  const lines = content.split(/\r?\n/);
  for (let l of lines) {
    l = l.trim();
    if (l.startsWith('require') || l.match(/^\s*require\s*\(/)) {
      // collect later via simple regex
    }
    // naive: capture module paths like github.com/x/y
    const m = l.match(/([a-z0-9_.\-\/]+\/[a-z0-9_.\-\/]+)(\s+v[0-9\.\-+\w]*)?/i);
    if (m) classifyLib(m[1], out);
  }
}

function parseCargoToml(content, out) {
  const lines = content.split(/\r?\n/);
  let inDeps = false;
  for (let l of lines) {
    l = l.trim();
    if (l.startsWith('[')) inDeps = l.toLowerCase().includes('dependencies');
    else if (inDeps && l) {
      const name = l.split('=')[0].trim();
      if (name) classifyLib(name, out);
    }
  }
}

function parseCsproj(content, out) {
  // look for <PackageReference Include="..." />
  const re = /<PackageReference\s+Include=\"([^\"]+)\"/gi;
  let m;
  while ((m = re.exec(content)) !== null) {
    classifyLib(m[1], out);
  }
}

function parsePomXml(content, out) {
  // look for <artifactId>xxx</artifactId>
  const re = /<artifactId>([^<]+)<\/artifactId>/gi;
  let m; const seen = new Set();
  while ((m = re.exec(content)) !== null) {
    const a = m[1].trim();
    if (!seen.has(a)) { classifyLib(a, out); seen.add(a); }
  }
}

function parseComposerJson(content, out) {
  try {
    const j = JSON.parse(content);
    const deps = Object.assign({}, j.require || {}, j['require-dev'] || {});
    for (const k of Object.keys(deps)) classifyLib(k, out);
  } catch (e) { }
}

function parseBuildGradle(content, out) {
  // look for implementation 'group:artifact:version' or compile 'group:artifact:version'
  const re = /['\"]([^'\"]+:[^'\"]+:[^'\"]+)['\"]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    classifyLib(m[1], out);
  }
}

function parseGeneric(content, filename, out) {
  const ext = path.extname(filename).toLowerCase();
  const hints = out.__hints || null;
  if (filename.toLowerCase().includes('package.json')) return parsePackageJson(content, out, hints);
  if (filename.toLowerCase().includes('requirements.txt')) return parseRequirementsTxt(content, out);
  if (filename.toLowerCase().includes('pyproject.toml')) return parsePyprojectToml(content, out);
  if (filename.toLowerCase().includes('go.mod')) return parseGoMod(content, out, hints);
  if (filename.toLowerCase().includes('cargo.toml')) return parseCargoToml(content, out);
  if (ext === '.csproj') return parseCsproj(content, out);
  if (filename.toLowerCase().includes('pom.xml')) return parsePomXml(content, out);
  if (filename.toLowerCase().includes('composer.json')) return parseComposerJson(content, out);
  if (filename.toLowerCase().includes('build.gradle')) return parseBuildGradle(content, out);
  // fallback small heuristics: package.json inside other names
}

async function processSubmission(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  let j;
  try { j = JSON.parse(raw); } catch (e) { return null; }
  const det = j.detected || {};
  const provided = j.provided || {};

  const result = { ...j };

  if (!det || !det.repo) {
    // nothing to fetch
    return result;
  }

  const [owner, repo] = String(det.repo).split('/');
  const default_branch = det.default_branch || 'main';
  const files = Array.isArray(det.relevant_files) ? det.relevant_files : [];

  const prefLang = pickPreferredLanguage(j);
  // hints object used by parsers to report runtime clues
  const hints = { runtimes: new Set() };

  const out = {
    languages: new Set(),
    storages: new Set(),
    messaging: new Set(),
    load_balancers: new Set(),
    frameworks: new Set(),
    libraries: new Set()
  };

  // attach hints to out so parseGeneric can access
  out.__hints = hints;

  if (prefLang) out.languages.add(prefLang);

  // quick file-based runtime hints (bun lock files etc)
  if (Array.isArray(files)) {
    for (const f of files) {
      const fn = String(f).toLowerCase();
      if (fn.includes('bun.lock') || fn.includes('bunfig')) hints.runtimes.add('bun');
      if (fn.includes('native-image') || fn.includes('native-image')) hints.runtimes.add('graalvm');
    }
  }

  for (const p of files) {
    try {
      const content = await ghFetchFile(owner, repo, p, default_branch);
      if (!content) continue;
      await parseGeneric(content, p, out);
    } catch (err) {
      // ignore fetch/parse errors for single file
    }
  }

  // derive runtimes from hints and heuristics
  const runtimesSet = hints.runtimes || new Set();
  // fallback heuristics when no explicit runtime found
  if (runtimesSet.size === 0) {
    const lang = prefLang || (Array.from(out.languages)[0] || '').toLowerCase();
    const filesLower = (files || []).map(x => String(x).toLowerCase());
    if (lang.includes('typescript') || lang.includes('javascript')) {
      // prefer bun if bun files were detected
      if (filesLower.some(f => f.includes('bun.lock') || f.includes('bunfig'))) runtimesSet.add('bun');
      else runtimesSet.add('node');
    } else if (lang.includes('go')) runtimesSet.add('go');
    else if (lang.includes('c#') || lang.includes('csharp') || lang.includes('dotnet')) runtimesSet.add('dotnet');
    else if (lang.includes('java')) {
      // graalvm hint check
      if (filesLower.some(f => f.includes('native-image') || f.includes('graal'))) runtimesSet.add('graalvm');
      else runtimesSet.add('jvm');
    } else if (lang.includes('rust')) runtimesSet.add('rust');
    else if (lang.includes('python')) runtimesSet.add('cpython');
    else if (lang.includes('php')) runtimesSet.add('php');
  }

  // also incorporate provided fields (storages, messaging, load-balancers, other-technologies)
  const providedKeys = { 'storages': 'storages', 'messaging': 'messaging', 'load-balancers': 'load_balancers', 'load_balancer': 'load_balancers', 'other-technologies': 'frameworks', 'frameworks': 'frameworks' };
  for (const k of Object.keys(provided)) {
    const mapped = providedKeys[k] || null;
    if (mapped) {
      const val = provided[k];
      if (Array.isArray(val)) for (const v of val) if (v) out[mapped].add(v);
      else if (val) out[mapped].add(val);
    }
  }

  // convert sets to arrays and attach
  const tech = {
    languages: Array.from(out.languages),
    runtimes: Array.from(runtimesSet),
    storages: Array.from(out.storages),
    messaging: Array.from(out.messaging),
    load_balancers: Array.from(out.load_balancers),
    frameworks: Array.from(out.frameworks),
    libraries: Array.from(out.libraries)
  };

  result.detected = result.detected || {};
  result.detected.technologies = tech;

  // write back
  await fs.writeFile(filePath, JSON.stringify(result, null, 2), 'utf8');
  return filePath;
}

async function readdirDirs(p) {
  const entries = await fs.readdir(p, { withFileTypes: true });
  return entries.filter(e => e.isDirectory()).map(d => d.name);
}

async function main() {
  console.log('Scanning submission.json files in participantes/*');
  const dirs = await readdirDirs(PARTICIPANTES);
  for (const d of dirs) {
    const submissionPath = path.join(PARTICIPANTES, d, 'submission.json');
    try {
      await fs.access(submissionPath);
    } catch (e) { continue; }
    try {
      const out = await processSubmission(submissionPath);
      console.log(d, '->', out ? 'enriched' : 'skipped');
    } catch (err) {
      console.error('error', d, err && err.message);
    }
  }
  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
