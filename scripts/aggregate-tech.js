#!/usr/bin/env node
const fs = require('fs/promises');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const PARTICIPANTES = path.join(REPO_ROOT, 'participantes');
const OUT = path.join(REPO_ROOT, 'tech.json');

async function readdirDirs(p) {
  const entries = await fs.readdir(p, { withFileTypes: true });
  return entries.filter(e => e.isDirectory()).map(d => d.name);
}

async function main() {
  const dirs = await readdirDirs(PARTICIPANTES);
  const results = [];
  for (const d of dirs) {
    const f = path.join(PARTICIPANTES, d, 'submission.json');
    try {
      const raw = await fs.readFile(f, 'utf8');
      const j = JSON.parse(raw);
      // ensure participant name included
      if (!j.participant) j.participant = d;
      results.push(j);
    } catch (e) {
      // ignore missing/invalid
    }
  }

  const out = {
    timestamp: new Date().toISOString(),
    total_participants: results.length,
    submissions: results
  };

  await fs.writeFile(OUT, JSON.stringify(out, null, 2), 'utf8');
  console.log(`Wrote ${OUT} with ${results.length} submissions`);
}

main().catch(err => { console.error(err); process.exit(1); });
