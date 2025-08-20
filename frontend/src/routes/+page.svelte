<script lang="ts">
  import { goto } from "$app/navigation";
  import SubmissionCard from "$lib/components/SubmissionCard.svelte";
  import * as icons from "simple-icons";
  import highlights from "$lib/data/highlights.json";
  import { getByParticipant, search } from "$lib/utils/submissions";
  import { normalizeMerged } from "$lib/utils/normalize";

  function openSubmissions() {
    goto("/submissions");
  }

  function scrollToContent() {
    const el = document.getElementById("main-content");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }

  const example = {
    language: "go",
    participante: "rinha-team",
    nome: "Joao Dev",
    total_liquido: 987,
    p99: 150,
    runtime: "go",
    storages: ["redis", "postgresql"],
    messaging: ["rabbitmq"],
    rank: 2,
  };

  const langCandidates = Object.keys(
    highlights.technology.languages_distribution || {},
  );

  const top3Raw = highlights.top_performers?.top_3_total_liquido || [];

  // using shared normalizeMerged from $lib/utils/normalize

  const top3 = top3Raw.map((t: any) => {
    const fallback = {
      nome: t.name,
      participante: t.participant,
      total_liquido: t.value,
      p99: t.p99 ?? null,
      rank: t.rank,
      language: "",
      runtime: "",
      storages: [],
      messaging: [],
      repo_url: null,
    };
    const merged = getByParticipant(t.participant);
    return normalizeMerged(merged, fallback);
  });

  // Overalls derived from highlights.json
  const totalParticipants = highlights.total_participants ?? 0;
  const totalSubmissions = highlights.total_submissions ?? 0;
  const languagesDist: Record<string, number> =
    highlights.technology?.languages_distribution || {};
  const totalLanguages = Object.keys(languagesDist).filter(Boolean).length;

  const topLanguages = Object.entries(languagesDist)
    .map(([k, v]) => ({ language: k, count: v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  function languageSlug(l: string) {
    if (!l) return "";
    const s = l.toLowerCase();
    if (s === "c#" || s === "csharp" || s === "dotnet") return "csharp";
    return s.replace(/\+/g, "plus").replace(/#/g, "sharp");
  }

  function getIconSvg(name: string) {
    if (!name) return null;
    function esc(s: string) {
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;");
    }
    const slug = languageSlug(String(name));
    const key =
      "si" + slug.replace(/(^.|-.)/g, (m) => m.replace("-", "").toUpperCase());
    const anyIcons: any = icons;
    const ico = anyIcons[key];
    if (!ico) {
      // fallback to local static icons for some langs
      if (slug === "java") {
        return `<img src="/icons/java.svg" alt="java" class="w-8 h-8" />`;
      }
      if (slug === "csharp") {
        return `<img src="/icons/csharp.svg" alt="c#" class="w-8 h-8" />`;
      }
      return null;
    }
    const label = esc(String(name));
    return `<svg class="w-8 h-8" role="img" aria-label="${label}" viewBox="0 0 24 24" fill="currentColor" style="color:#${ico.hex}"><title>${label}</title><path d="${ico.path}"/></svg>`;
  }

  const chartLanguages = Object.entries(languagesDist)
    .map(([k, v]) => ({ language: k, count: v }))
    .sort((a, b) => b.count - a.count);

  const maxLangCount = chartLanguages.length ? chartLanguages[0].count : 1;

  // Menções honrosas: resolve submissions for highlights
  const participation = highlights.participation || {};
  const topP99 = participation.top_p99 || null;
  const firstSubmission = participation.first_submission || null;
  const lastSubmission = participation.last_submission || null;

  function findSubmissionByParticipantOrQuery({
    participant,
    name,
    username,
  }: any) {
    if (participant) {
      const s = getByParticipant(participant);
      if (s) return s;
    }
    if (username) {
      const res = search({ q: username });
      if (res && res.length) return res[0];
    }
    if (name) {
      const res = search({ q: name });
      if (res && res.length) return res[0];
    }
    return null;
  }

  // Resolve each mention into a dedicated variable for easier rendering
  const submissionMelhor =
    topP99 && topP99.participant
      ? normalizeMerged(getByParticipant(topP99.participant), {})
      : null;
  const subtitleMelhor = topP99
    ? `${topP99.name || ""} — ${topP99.value}`.trim()
    : "";

  const submissionPrimeira = firstSubmission
    ? normalizeMerged(getByParticipant(firstSubmission.participant), {})
    : null;
  const subtitlePrimeira = firstSubmission
    ? firstSubmission.name
      ? `${firstSubmission.name} — ${firstSubmission.date}`
      : `${firstSubmission.date}`
    : "";

  const submissionUltima = lastSubmission
    ? normalizeMerged(getByParticipant(lastSubmission.participant), {})
    : null;
  const subtitleUltima = lastSubmission
    ? lastSubmission.name
      ? `${lastSubmission.name} — ${lastSubmission.date}`
      : `${lastSubmission.date}`
    : "";
</script>

<main class="bg-base-100 text-base-content">
  <section class="min-h-screen flex items-center">
    <div class="container mx-auto px-6">
      <div class="max-w-5xl mx-auto text-center">
        <div class="text-9xl mb-6">🐔</div>
        <h1 class="text-4xl md:text-5xl font-bold mb-4">
          Rinha de Backend 2025
        </h1>
        <p class="text-lg md:text-xl text-muted mb-8">
          Resultados, destaques e análises das submissões.
        </p>

        <div class="mt-8 flex justify-center">
          <button
            aria-label="Ver resultados"
            on:click={scrollToContent}
            class="-mb-2 bg-transparent border-0 cursor-pointer flex flex-col items-center"
          >
            <svg
              class="w-8 h-8 text-muted animate-bounce"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M5 7l5 5 5-5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <div class="text-xs text-muted mt-1">ver resultados</div>
          </button>
        </div>
      </div>
    </div>
  </section>

  <section id="main-content" class="container mx-auto px-6 py-16">
    <h2 class="text-4xl font-semibold mb-4 text-center">Vencedores</h2>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {#each top3 as t}
        <SubmissionCard submission={t} />
      {/each}
    </div>

    <div class="mt-12 max-w-6xl mx-auto">
      <h2 class="text-4xl font-semibold mb-4 text-center">Análise geral</h2>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="card bg-base-200 p-4">
          <div class="text-sm text-muted">Total de submissões</div>
          <div class="text-2xl font-bold">{totalSubmissions}</div>
        </div>
        <div class="card bg-base-200 p-4">
          <div class="text-sm text-muted">Total de participantes</div>
          <div class="text-2xl font-bold">{totalParticipants}</div>
        </div>
        <div class="card bg-base-200 p-4">
          <div class="text-sm text-muted">Total de linguagens diferentes</div>
          <div class="text-2xl font-bold">{totalLanguages}</div>
        </div>
      </div>

      <div class="mb-4 text-center">
        <h2 class="text-2xl text-muted">Linguagens mais usadas</h2>
        <div class="flex items-center justify-center gap-6 mt-2">
          {#each topLanguages as tl}
            <div class="card p-3 bg-base-200 flex flex-col items-center w-36">
              <div class="mb-2">
                {@html getIconSvg(tl.language) ||
                  '<div class="w-8 h-8 bg-base-300 rounded"></div>'}
              </div>
              <div class="font-semibold">{tl.language}</div>
              <div class="text-sm text-muted">{tl.count}</div>
            </div>
          {/each}
        </div>
      </div>

      <div class="overflow-x-auto">
        <div class="flex items-end gap-3 py-4" style="min-width: max-content;">
          {#each chartLanguages as cl}
            <div class="flex flex-col items-center w-16">
              <div class="text-sm text-muted mb-1">{cl.count}</div>
              <div
                class="h-48 w-8 bg-base-200 rounded-md flex items-end overflow-hidden"
              >
                <div
                  class="w-full bg-primary"
                  style="height: {Math.round((cl.count / maxLangCount) * 100)}%"
                ></div>
              </div>
              <div class="mt-2 text-xs text-center truncate w-full">
                {cl.language}
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div class="mt-12 max-w-2xl mx-auto">
        <h2 class="text-4xl font-semibold mb-4 text-center">
          Menções honrosas
        </h2>
        <div class="space-y-6 mb-8">
          <div>
            <div class="text-2xl text-center">
              Melhor performance bruta (p99)
            </div>
            <div class="mt-3">
              {#if submissionMelhor}
                <div class="text-1xl text-center">{subtitleMelhor}</div>

                <SubmissionCard submission={submissionMelhor} />
              {:else}
                <div class="card bg-base-200 p-4">
                  <div class="text-xs text-muted mt-2">
                    Não foi possível localizar a submissão correspondente.
                  </div>
                </div>
              {/if}
            </div>
          </div>

          <div>
            <div class="text-2xl text-center">Primeira submissão</div>
            <div class="mt-3">
              {#if submissionPrimeira}
                <div class="text-1xl text-center">{subtitlePrimeira}</div>

                <SubmissionCard submission={submissionPrimeira} />
              {:else}
                <div class="card bg-base-200 p-4">
                  <div class="text-xs text-muted mt-2">
                    Não foi possível localizar a submissão correspondente.
                  </div>
                </div>
              {/if}
            </div>
          </div>

          <div>
            <div class="text-2xl text-center">Última submissão</div>
            <div class="mt-3">
              {#if submissionUltima}
                <div class="text-1xl text-center">{subtitleUltima}</div>

                <SubmissionCard submission={submissionUltima} />
              {:else}
                <div class="card bg-base-200 p-4">
                  <div class="text-xs text-muted mt-2">
                    Não foi possível localizar a submissão correspondente.
                  </div>
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</main>
