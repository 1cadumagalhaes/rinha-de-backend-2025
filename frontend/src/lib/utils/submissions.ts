import submissionsJson from '$lib/data/submissions.json';

export type SubmissionRecord = any;

const all: SubmissionRecord[] = (submissionsJson as any).submissions || [];

// compute and attach a numeric rank (1 = highest total_liquido) for every
// submission in memory so UI can show ranks on every card. Preserve any
// existing rank value if present.
; (function computeRanks() {
  function totalFor(s: SubmissionRecord) {
    return Number(s.resultado_final?.total_liquido ?? s.total_liquido ?? 0) || 0;
  }

  const copy = all.slice().map((s) => ({ p: s.participant, total: totalFor(s) }));
  copy.sort((a, b) => b.total - a.total);

  for (let i = 0; i < copy.length; i++) {
    const participant = copy[i].p;
    const idx = all.findIndex((x) => x.participant === participant);
    const computedRank = i + 1;
    if (idx !== -1) {
      // only set if not present to avoid overwriting intentional ranks
      if (all[idx].rank == null) all[idx].rank = computedRank;
    }
  }
})();

export function getAll(): SubmissionRecord[] {
  return all;
}

export function getByParticipant(participant: string): SubmissionRecord | null {
  if (!participant) return null;
  return all.find((s) => s.participant === participant) || null;
}

export function search(filters: { language?: string; runtime?: string; storage?: string; q?: string } = {}) {
  return all.filter((s) => {
    if (filters.language) {
      // detected.language can be a string or an array; normalize to an array
      const rawLangs = s.tech?.detected?.language ?? s.tech?.provided?.langs ?? s.info?.langs ?? [];
      const langs = (Array.isArray(rawLangs) ? rawLangs : [rawLangs])
        .filter(Boolean)
        .map((l: string) => String(l).toLowerCase());
      if (!langs.includes(filters.language.toLowerCase())) return false;
    }
    if (filters.runtime) {
      const runtime = (s.tech?.detected?.runtime || '').toLowerCase();
      if (runtime !== filters.runtime.toLowerCase()) return false;
    }
    if (filters.storage) {
      const stores = (s.tech?.detected?.storage || s.tech?.provided?.storages || s.info?.storages || []).map((x: string) => String(x).toLowerCase());
      if (!stores.includes(filters.storage.toLowerCase())) return false;
    }
    if (filters.q) {
      const q = filters.q.toLowerCase();
      const hay = [s.name, s.participant, s.info?.name, s.tech?.repo_name, s.tech?.repo_owner_url].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export default { getAll, getByParticipant, search };
