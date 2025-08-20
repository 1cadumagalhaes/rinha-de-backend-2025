<script lang="ts">
  import { onMount } from "svelte";
  import SubmissionCard from "$lib/components/SubmissionCard.svelte";
  import highlights from "$lib/data/highlights.json";
  import { getAll, search } from "$lib/utils/submissions";
  import { normalizeMerged } from "$lib/utils/normalize";

  // theme is managed globally by the layout's `isNightStore`

  let q = "";
  let language = "";
  let runtime = "";
  let storage = "";
  let order = "total_desc";

  let results: any[] = [];

  const languages = Object.keys(
    highlights.technology?.languages_distribution || {},
  );
  const runtimes = Object.keys(
    highlights.technology?.runtimes_distribution || {},
  );
  const storages = Object.keys(
    highlights.technology?.storages_distribution || {},
  );

  function normalizeNumberString(v: any) {
    if (v == null) return null;
    const s = String(v).replace(/\s*/g, "");
    const n = s.replace(/[^0-9.,-]/g, "").replace(/,/g, ".");
    const num = Number(n);
    return Number.isFinite(num) ? num : null;
  }

  function getTotal(sub: any) {
    return (
      Number(sub.resultado_final?.total_liquido ?? sub.total_liquido ?? 0) || 0
    );
  }

  function getP99(sub: any) {
    const raw = sub.resultado_final?.p99?.valor ?? sub.p99 ?? null;
    const n = normalizeNumberString(raw);
    return n == null ? Infinity : n;
  }

  function sortResults(arr: any[]) {
    const copy = arr.slice();
    copy.sort((a: any, b: any) => {
      if (order === "total_desc") return getTotal(b) - getTotal(a);
      if (order === "total_asc") return getTotal(a) - getTotal(b);
      if (order === "p99_asc") return getP99(a) - getP99(b);
      if (order === "p99_desc") return getP99(b) - getP99(a);
      if (order === "participant_asc") {
        const A = String(a.participant || a.participante || "").toLowerCase();
        const B = String(b.participant || b.participante || "").toLowerCase();
        return A < B ? -1 : A > B ? 1 : 0;
      }
      return 0;
    });
    return copy;
  }

  function updateResults() {
    let res =
      search({
        language: language || undefined,
        runtime: runtime || undefined,
        storage: storage || undefined,
        q: q || undefined,
      }) || [];

    // normalize each result so SubmissionCard receives a consistent schema
    res = res.map((r: any) => normalizeMerged(r, {}));

    results = sortResults(res);
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
  <!-- navbar moved to layout.svelte -->

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

              <div class="flex gap-2">
                <button class="btn btn-ghost" on:click={clearFilters}
                  >Limpar</button
                >
                <button class="btn btn-primary" on:click={updateResults}
                  >Aplicar</button
                >
              </div>
            </div>
          </div>
        </div>

        <div class="col-span-1 md:col-span-3">
          <div class="mb-3 flex items-center justify-between">
            <div class="text-sm text-muted">{results.length} resultados</div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {#if results && results.length}
              {#each results as r}
                <SubmissionCard submission={r} />
              {/each}
            {:else}
              <div class="col-span-full text-center py-12 text-sm text-muted">
                Nenhuma submissão encontrada com esses filtros.
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </section>
</main>
