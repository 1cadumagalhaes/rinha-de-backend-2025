export function normalizeMerged(r: any, fallback: any = {}) {
  const defaults = {
    participante: "",
    nome: "",
    total_liquido: 0,
    p99: null,
    runtime: "",
    language: "",
    storages: [],
    messaging: [],
    rank: null,
    repo_url: null,
  };

  const fb = { ...defaults, ...fallback };

  if (!r) return fb;

  return {
    participante: r.participant || r.participante || fb.participante,
    nome: r.name || r.nome || r.info?.name || fb.nome,
    total_liquido:
      r.resultado_final?.total_liquido ?? r.total_liquido ?? fb.total_liquido,
    p99: r.resultado_final?.p99?.valor ?? r.p99 ?? fb.p99,
    // prefer detected -> provided -> info -> fallback
    runtime:
      r.tech?.detected?.runtime ||
      r.tech?.provided?.runtime ||
      r.info?.runtime ||
      fb.runtime,
    language:
      r.tech?.detected?.language ||
      (Array.isArray(r.tech?.provided?.langs) ? r.tech.provided.langs[0] : null) ||
      (Array.isArray(r.info?.langs) ? r.info.langs[0] : null) ||
      r.info?.language ||
      fb.language,
    storages:
      r.tech?.detected?.storage ||
      r.tech?.provided?.storages ||
      r.info?.storages ||
      fb.storages || [],
    messaging:
      r.tech?.detected?.messaging ||
      r.tech?.provided?.messaging ||
      r.info?.messaging ||
      fb.messaging || [],
    rank: r.rank ?? r.resultado_final?.rank ?? fb.rank,
    repo_url:
      r.tech?.repo_url || r.info?.repo_url || fb.repo_url || null,
  };
}
