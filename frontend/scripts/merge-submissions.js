import fs from 'fs/promises';
import path from 'path';

const root = path.resolve();

const paths = {
  resultados: path.join(root, 'static', 'resultados-finais+participantes-info-ordered.json'),
  tech: path.join(root, 'src', 'lib', 'data', 'tech-stack-analysis.json'),
  highlights: path.join(root, 'src', 'lib', 'data', 'highlights.json'),
  out: path.join(root, 'src', 'lib', 'data', 'submissions.json'),
};

function collectNodesWithKey(obj, key, out = []) {
  if (!obj || typeof obj !== 'object') return out;
  if (Array.isArray(obj)) {
    for (const v of obj) collectNodesWithKey(v, key, out);
    return out;
  }
  if (Object.prototype.hasOwnProperty.call(obj, key)) out.push(obj);
  for (const k of Object.keys(obj)) collectNodesWithKey(obj[k], key, out);
  return out;
}

async function readJson(p) {
  const raw = await fs.readFile(p, 'utf8');
  return JSON.parse(raw);
}

async function main() {
  console.log('reading resultados...');
  const resultados = await readJson(paths.resultados);

  console.log('reading tech-stack-analysis...');
  const tech = await readJson(paths.tech);

  console.log('reading highlights...');
  const highlights = await readJson(paths.highlights);

  const byParticipant = new Map();

  // load resultados entries
  for (const entry of resultados) {
    const participante = entry?.resultado_final?.participante || entry?.participante || entry?.info?.participant || null;
    if (!participante) continue;
    byParticipant.set(participante, {
      participant: participante,
      info: entry.info ?? null,
      resultado_final: entry.resultado_final ?? null,
      _source: { from: 'resultados' },
    });
  }

  // find tech-stack entries that have participant
  const techNodes = collectNodesWithKey(tech, 'participant');
  for (const t of techNodes) {
    const pid = t.participant;
    if (!pid) continue;
    const existing = byParticipant.get(pid) ?? { participant: pid };
    existing.tech = t;
    existing._source = existing._source ?? {};
    existing._source.tech = true;
    byParticipant.set(pid, existing);
  }

  // attach highlights per participant when possible
  const highlightNodes = collectNodesWithKey(highlights, 'participant');
  for (const h of highlightNodes) {
    const pid = h.participant || h.participant;
    if (!pid) continue;
    const item = byParticipant.get(pid) ?? { participant: pid };
    item.highlights = item.highlights || [];
    item.highlights.push(h);
    byParticipant.set(pid, item);
  }

  // produce final array
  const submissions = Array.from(byParticipant.values()).map((s) => {
    const merged = {
      participant: s.participant,
      name: s.info?.name || s.tech?.name || s.resultado_final?.name || null,
      info: s.info ?? null,
      resultado_final: s.resultado_final ?? null,
      tech: s.tech ?? null,
      highlights: s.highlights ?? null,
    };
    return merged;
  });

  // sort by total_liquido desc when available
  submissions.sort((a, b) => {
    const av = a.resultado_final?.total_liquido ?? 0;
    const bv = b.resultado_final?.total_liquido ?? 0;
    return bv - av;
  });

  await fs.mkdir(path.dirname(paths.out), { recursive: true });
  await fs.writeFile(paths.out, JSON.stringify({ generated: new Date().toISOString(), count: submissions.length, submissions }, null, 2), 'utf8');
  console.log('wrote', paths.out, submissions.length, 'entries');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
