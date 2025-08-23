<script lang="ts">
  import { onMount } from "svelte";
  import SubmissionCard from "$lib/components/SubmissionCard.svelte";
  import highlights from "$lib/data/highlights.json";
  import { getAll, search } from "$lib/utils/submissions";
  import type { SubmissionRecord } from "$lib/types/submission";

  let q = "";
  let language = "";
  let runtime = "";
  let storage = "";
  let order = "total_desc";

  let results: SubmissionRecord[] = [];

  // Derive filter lists from highlights data
  const languages = Object.keys(highlights.language_distribution || {}).sort();
  const runtimes = Object.keys(highlights.runtime_distribution || {}).sort();

  // Extract unique storages from all submissions
  const allSubmissions = getAll();
  const storages = Array.from(
    new Set(allSubmissions.flatMap((s) => s.tech_stack?.storages || [])),
  ).sort();

  function getTotal(submission: SubmissionRecord): number {
    return submission.results?.financeiro?.total_liquido || 0;
  }

  function getP99(submission: SubmissionRecord): number {
    return submission.results?.performance?.p99 || Infinity;
  }

  function getParticipantName(submission: SubmissionRecord): string {
    return submission.user?.name || submission.submission_id || "";
  }

  function sortResults(submissions: SubmissionRecord[]): SubmissionRecord[] {
    return [...submissions].sort((a, b) => {
      switch (order) {
        case "total_desc":
          return getTotal(b) - getTotal(a);
        case "total_asc":
          return getTotal(a) - getTotal(b);
        case "p99_asc":
          return getP99(a) - getP99(b);
        case "p99_desc":
          return getP99(b) - getP99(a);
        case "participant_asc":
          return getParticipantName(a).localeCompare(getParticipantName(b));
        default:
          return 0;
      }
    });
  }

  function updateResults() {
    const searchResults = search({
      language: language || undefined,
      runtime: runtime || undefined,
      storage: storage || undefined,
      q: q || undefined,
    });

    results = sortResults(searchResults);
  }

  function clearFilters() {
    q = "";
    language = "";
    runtime = "";
    storage = "";
    order = "total_desc";
    updateResults();
  }

  onMount(() => {
    updateResults();
  });
</script>

<main class="min-h-screen bg-base-100 text-base-content">
  <section class="container mx-auto px-6 py-8">
    <div class="max-w-6xl mx-auto">
      <div
        class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6"
      >
        <div>
          <h1 class="text-2xl font-bold">Explorar submissões</h1>
          <div class="text-sm text-muted">
            Busque, filtre e ordene as submissões
          </div>
        </div>

        <div
          class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
        >
          <input
            placeholder="Pesquisar participante, nome ou repositório"
            bind:value={q}
            on:input={updateResults}
            class="input input-bordered w-full sm:w-80"
          />

          <select
            bind:value={order}
            on:change={updateResults}
            class="select select-bordered"
          >
            <option value="total_desc">Total líquido — maior primeiro</option>
            <option value="total_asc">Total líquido — menor primeiro</option>
            <option value="p99_asc">p99 — menor primeiro</option>
            <option value="p99_desc">p99 — maior primeiro</option>
            <option value="participant_asc">Participante — A → Z</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="col-span-1">
          <div class="card bg-base-200 p-4">
            <div class="font-semibold mb-2">Filtros</div>
            <div class="space-y-3">
              <div>
                <label for="filter-lang" class="text-xs text-muted"
                  >Linguagem</label
                >
                <input
                  id="filter-lang"
                  list="langs"
                  bind:value={language}
                  on:input={updateResults}
                  placeholder="Todas"
                  class="input input-bordered w-full"
                />
                <datalist id="langs">
                  {#each languages as l}
                    <option value={l}></option>
                  {/each}
                </datalist>
              </div>

              <div>
                <label for="filter-runtime" class="text-xs text-muted"
                  >Runtime</label
                >
                <input
                  id="filter-runtime"
                  list="runtimes"
                  bind:value={runtime}
                  on:input={updateResults}
                  placeholder="Todas"
                  class="input input-bordered w-full"
                />
                <datalist id="runtimes">
                  {#each runtimes as r}
                    <option value={r}></option>
                  {/each}
                </datalist>
              </div>

              <div>
                <label for="filter-storage" class="text-xs text-muted"
                  >Storage</label
                >
                <input
                  id="filter-storage"
                  list="storages"
                  bind:value={storage}
                  on:input={updateResults}
                  placeholder="Todas"
                  class="input input-bordered w-full"
                />
                <datalist id="storages">
                  {#each storages as s}
                    <option value={s}></option>
                  {/each}
                </datalist>
              </div>

              <div class="flex justify-start">
                <button class="btn btn-ghost" on:click={clearFilters}>
                  Limpar filtros
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="col-span-1 md:col-span-3">
          <div class="mb-4 flex items-center justify-between">
            <div class="text-sm text-muted">
              {results.length}
              {results.length === 1 ? "resultado" : "resultados"}
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {#if results.length > 0}
              {#each results as submission}
                <SubmissionCard {submission} />
              {/each}
            {:else}
              <div class="col-span-full text-center py-12 text-muted">
                Nenhuma submissão encontrada com os filtros aplicados.
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </section>
</main>
