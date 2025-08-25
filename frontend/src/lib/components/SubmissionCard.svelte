<script lang="ts">
  import UserCard from "$lib/components/UserCard.svelte";
  import Metric from "$lib/components/Metric.svelte";
  import { type SubmissionRecord } from "$lib/types/submission";
  import {
    compactNumber,
    rankBorderColor,
    formatCurrency,
    languageSlug,
  } from "$lib/utils/format";
  import { getIconSvg, findIconFor } from "$lib/utils/icons";
  import metricsDescriptions from "$lib/data/metrics_descriptions.json";

  export let submission: any = {};

  const sample: SubmissionRecord = {
    submission_id: "galinho",
    source_code_repo: "https://github.com/1cadumagalhaes/rinha-de-backend-2025",
    commits_count: 100,
    first_commit: "2025-08-13T17:01:24",
    last_commit: "2025-08-15T13:07:14",
    rank: 1,
    performance_rank: 1,
    user: {
      name: "Cadu Magalhães",
      socials: [
        "https://www.linkedin.com/in/1cadumagalhaes/",
        "https://x.com/1cadumagalhaes",
        "https://bsky.app/profile/cadumagalhaes.me",
      ],
      github: "1cadumagalhaes",
      github_profile_pic: null,
      num_submissions: 1,
    },
    tech_stack: {
      languages: ["python"],
      runtimes: ["python"],
      storages: ["postgresql"],
      messaging: [],
      load_balancers: ["nginx"],
      others: ["uv", "fastapi"],
      tags: ["pytthon", "fastapi", "postgresql"],
    },
    results: {
      financeiro: {
        total_liquido: 1000000,
        total_bruto: 1000000,
        total_taxas: 200000,
        multa_total: 0,
        multa_porcentagem: 0,
        bonus: 200000,
        caixa_dois: true,
      },
      performance: {
        p99: 4.5,
        max_requests: 603.0,
        num_pagamentos_solicitados: 100000,
        lag: 0,
        num_pagamentos_falha: 0,
        num_inconsistencias: 0,
        total_bruto_projetado: 1000000,
      },
      pagamentos: {
        default_total_bruto: 600000,
        default_num_pagamentos: 60000,
        default_total_taxas: 50000,
        fallback_total_bruto: 400000,
        fallback_total_taxas: 150000,
        fallback_num_pagamentos: 40000,
        default_pct_num_requests: 60,
        default_pct_total_bruto: 60,
      },
    },
  };

  let data = { ...sample, ...submission };

  $: data = { ...sample, ...submission };
  // normalized repo URL for use both in the mini card and modal
  $: repoUrl = data.source_code_repo || null;

  // Computed variables for cleaner markup
  $: totalLiquido = data.results?.financeiro?.total_liquido ?? 0;
  $: formattedTotalLiquido = compactNumber(Number(totalLiquido));
  $: p99 = data.results?.performance?.p99 ?? "-";

  // Helper function to filter out items with dots (URLs, domains, etc.) but keep .net
  const shouldIncludeItem = (item: string) => {
    if (!item) return false;
    if (item.toLowerCase() === ".net") return true; // Keep .net as exception
    return !item.includes("."); // Filter out other items with dots
  };

  // Filter out items with dots (URLs, domains, etc.) for front card display
  $: primaryLanguage =
    data.tech_stack?.languages?.filter(shouldIncludeItem)[0] || "-";
  $: primaryRuntime =
    data.tech_stack?.runtimes?.filter(shouldIncludeItem)[0] || "-";
  $: primaryStorage =
    data.tech_stack?.storages?.filter(shouldIncludeItem)[0] || "-";

  $: commitsCount = data.commits_count ?? "-";
  $: firstCommit = data.first_commit ?? "-";
  $: lastCommit = data.last_commit ?? "-";

  // Performance metrics
  $: performanceP99 = data?.results?.performance?.p99;
  $: performanceMaxRequests = data?.results?.performance?.max_requests;
  $: performanceNumPagamentos =
    data?.results?.performance?.num_pagamentos_solicitados;
  $: performanceLag = data?.results?.performance?.lag;

  // Financial metrics
  $: financialTotalLiquido = formatCurrency(
    data.results?.financeiro?.total_liquido || 0,
  );
  $: financialTotalBruto = formatCurrency(
    data.results?.financeiro?.total_bruto || 0,
  );
  $: financialTotalTaxas = formatCurrency(
    data.results?.financeiro?.total_taxas || 0,
  );
  $: multaPercentage = data?.results?.financeiro?.multa_porcentagem || 0;
  $: multaTotal = formatCurrency(data?.results?.financeiro?.multa_total || 0);
  $: bonusPercentage = data?.results?.financeiro?.bonus || 0;
  $: bonusTotal = formatCurrency(
    (data?.results?.financeiro?.total_bruto || 0) * (bonusPercentage / 100),
  );
  $: caixaDois = data?.results?.financeiro?.caixa_dois;

  // Payment metrics
  $: defaultTotalBruto = formatCurrency(
    data?.results?.pagamentos?.default_total_bruto || 0,
  );
  $: defaultNumPagamentos =
    data?.results?.pagamentos?.default_num_pagamentos ?? "-";
  $: defaultTotalTaxas = formatCurrency(
    data?.results?.pagamentos?.default_total_taxas || 0,
  );
  $: fallbackTotalBruto = formatCurrency(
    data?.results?.pagamentos?.fallback_total_bruto || 0,
  );
  $: fallbackNumPagamentos =
    data?.results?.pagamentos?.fallback_num_pagamentos ?? 0;
  $: fallbackTotalTaxas = formatCurrency(
    data?.results?.pagamentos?.fallback_total_taxas || 0,
  );

  // Pizza chart data for payments
  $: defaultTotalBrutoValue =
    data?.results?.pagamentos?.default_total_bruto || 0;
  $: fallbackTotalBrutoValue =
    data?.results?.pagamentos?.fallback_total_bruto || 0;
  $: defaultNumPagamentosValue =
    data?.results?.pagamentos?.default_num_pagamentos || 0;
  $: fallbackNumPagamentosValue =
    data?.results?.pagamentos?.fallback_num_pagamentos || 0;
  $: defaultTotalTaxasValue =
    data?.results?.pagamentos?.default_total_taxas || 0;
  $: fallbackTotalTaxasValue =
    data?.results?.pagamentos?.fallback_total_taxas || 0;

  $: totalBrutoSum = defaultTotalBrutoValue + fallbackTotalBrutoValue;
  $: totalNumPagamentosSum =
    defaultNumPagamentosValue + fallbackNumPagamentosValue;
  $: totalTaxasSum = defaultTotalTaxasValue + fallbackTotalTaxasValue;

  $: defaultBrutoPercentage =
    totalBrutoSum > 0 ? (defaultTotalBrutoValue / totalBrutoSum) * 100 : 0;
  $: fallbackBrutoPercentage =
    totalBrutoSum > 0 ? (fallbackTotalBrutoValue / totalBrutoSum) * 100 : 0;

  $: defaultNumPercentage =
    totalNumPagamentosSum > 0
      ? (defaultNumPagamentosValue / totalNumPagamentosSum) * 100
      : 0;
  $: fallbackNumPercentage =
    totalNumPagamentosSum > 0
      ? (fallbackNumPagamentosValue / totalNumPagamentosSum) * 100
      : 0;

  $: defaultTaxasPercentage =
    totalTaxasSum > 0 ? (defaultTotalTaxasValue / totalTaxasSum) * 100 : 0;
  $: fallbackTaxasPercentage =
    totalTaxasSum > 0 ? (fallbackTotalTaxasValue / totalTaxasSum) * 100 : 0;

  // Tech stack icons - collect all items except tags and deduplicate
  $: allTechItems = [
    ...(data.tech_stack?.languages || []),
    ...(data.tech_stack?.runtimes || []),
    ...(data.tech_stack?.storages || []),
    ...(data.tech_stack?.messaging || []),
    ...(data.tech_stack?.load_balancers || []),
    ...(data.tech_stack?.others || []),
  ]
    .filter(Boolean) // Remove any falsy values
    .map((item) => item.toLowerCase()); // Ensure all items are lowercased

  $: techIcons = Array.from(new Set(allTechItems)) // Deduplicate using Set
    .map((item) => ({
      name: item,
      svg: getIconSvg(item, "w-8 h-8"),
    }))
    .filter((icon) => icon.svg); // Only include items that have icons
  // Language icon for collapsed view
  $: languageIcon =
    primaryLanguage !== "-" ? getIconSvg(primaryLanguage, "w-12 h-12") : null;

  $: bonus =
    data.results &&
    data?.results?.financeiro.bonus &&
    data?.results?.financeiro.bonus > 0;
  $: multa = data.results && data?.results?.financeiro.multa_total > 0;
  let open = false;
</script>

<article
  class="card bg-base-200 shadow-md hover:shadow-xl hover:scale-[1.02] transition-all duration-200 relative px-6 py-5 min-w-[18rem] group"
  style={data.rank && data.rank <= 3
    ? `border: 2px solid ${rankBorderColor(data.rank)};`
    : ""}
>
  <button
    class="absolute inset-0 w-full h-full cursor-pointer bg-transparent border-none p-0 m-0 z-10"
    on:click={() => (open = true)}
    on:keydown={(e) => e.key === "Enter" && (open = true)}
    aria-label={`Ver detalhes de ${data.user?.name} - ${data.submission_id}`}
  ></button>
  {#if data.rank && data.rank <= 3}
    <div class="absolute -top-3 left-3 z-20">
      <span
        class="badge badge-lg"
        style="background: {data.rank === 1
          ? '#f59e0b'
          : data.rank === 2
            ? '#9ca3af'
            : '#b87333'}; color: white">{data.rank}</span
      >
    </div>
  {/if}

  <!-- Header: name (big) and participant, then icon+amount row, tags, and fixed detalhes button -->
  <div
    class="card-body p-0 flex flex-col h-full relative z-10 pointer-events-none"
  >
    <!-- person name full row -->
    <div
      class="text-xl font-bold group-hover:text-primary transition-colors duration-200"
    >
      {data.user?.name}
    </div>
    <!-- subtitle as submission id / participant -->
    <div
      class="text-sm text-muted mb-4 group-hover:text-base-content transition-colors duration-200"
    >
      {data.submission_id}
    </div>

    <!-- icon left, amount + p99 right -->
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <div
          class="w-20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200"
        >
          {#if languageIcon}
            {@html languageIcon}
          {:else}
            <div
              class="w-12 h-12 bg-base-300 rounded flex items-center justify-center text-xl font-bold group-hover:bg-primary group-hover:text-primary-content transition-colors duration-200"
            >
              {primaryLanguage.charAt(0).toUpperCase()}
            </div>
          {/if}
        </div>
      </div>

      <div class="text-right">
        <div
          class="text-2xl font-bold group-hover:text-success transition-colors duration-200"
        >
          R$ {formattedTotalLiquido}
        </div>
        <div
          class="text-sm text-muted group-hover:text-base-content transition-colors duration-200"
        >
          p99: {p99} ms
        </div>
      </div>
    </div>

    <!-- compact tag badges (no labels) -->
    <div class="mt-4 flex items-center gap-2">
      <span
        class="badge badge-primary group-hover:badge-outline transition-all duration-200"
        >{primaryLanguage.toLowerCase()}</span
      >
      <span
        class="badge badge-secondary group-hover:badge-outline transition-all duration-200"
        >{primaryRuntime.toLowerCase()}</span
      >
      <span
        class="badge badge-accent group-hover:badge-outline transition-all duration-200"
        >{primaryStorage.toLowerCase()}</span
      >
    </div>

    <!-- fixed action at bottom -->
    <div class="mt-auto flex justify-end relative z-20 pointer-events-auto">
      <button
        class="btn btn-sm btn-outline group-hover:btn-primary group-hover:shadow-lg transition-all duration-200"
        on:click={() => (open = true)}>detalhes</button
      >
    </div>
  </div>
</article>

<!-- Modal with full details - moved outside the card -->
{#if open}
  <div
    class="modal modal-open"
    on:click={() => (open = false)}
    on:keydown={(e) => e.key === "Escape" && (open = false)}
    role="button"
    tabindex="-1"
    aria-label="Close modal"
  >
    <div
      class="modal-box max-w-4xl"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      aria-modal="true"
      tabindex="0"
    >
      <div class="flex gap-6">
        <div class="w-1/3">
          <UserCard
            repoUrl={data.source_code_repo ?? "-"}
            name={data.user?.name}
            avatarUrl={data.user?.github_profile_pic}
            socials={data.user?.socials}
          />

          <div class="mt-4">
            <div class="flex flex-wrap gap-2">
              {#each techIcons as icon}
                <div class="tooltip" data-tip={icon.name}>
                  {@html icon.svg}
                </div>
              {/each}
            </div>
          </div>

          <div class="mt-4">
            {#if data.tech_stack?.languages}
              <div class="mb-2">
                <div class="text-xs text-muted">Language</div>
                <div class="mt-1 flex flex-wrap gap-2">
                  {#each data.tech_stack.languages.filter(shouldIncludeItem) as v}
                    <span class="badge badge-primary badge-sm"
                      >{v.toLowerCase()}</span
                    >
                  {/each}
                </div>
              </div>
            {/if}

            {#if data.tech_stack?.runtimes}
              <div class="mb-2">
                <div class="text-xs text-muted">Runtime</div>
                <div class="mt-1 flex flex-wrap gap-2">
                  {#each data.tech_stack.runtimes.filter(shouldIncludeItem) as v}
                    <span class="badge badge-secondary badge-sm"
                      >{v.toLowerCase()}</span
                    >
                  {/each}
                </div>
              </div>
            {/if}

            {#if data.tech_stack?.storages}
              <div class="mb-2">
                <div class="text-xs text-muted">Storage</div>
                <div class="mt-1 flex flex-wrap gap-2">
                  {#each data.tech_stack.storages.filter(shouldIncludeItem) as v}
                    <span class="badge badge-accent badge-sm"
                      >{v.toLowerCase()}</span
                    >
                  {/each}
                </div>
              </div>
            {/if}

            {#if data.tech_stack?.messaging}
              <div class="mb-2">
                <div class="text-xs text-muted">Messaging</div>
                <div class="mt-1 flex flex-wrap gap-2">
                  {#each data.tech_stack.messaging.filter(shouldIncludeItem) as v}
                    <span class="badge badge-info badge-sm"
                      >{v.toLowerCase()}</span
                    >
                  {/each}
                </div>
              </div>
            {/if}

            {#if data.tech_stack?.load_balancers}
              <div class="mb-2">
                <div class="text-xs text-muted">Load balancers</div>
                <div class="mt-1 flex flex-wrap gap-2">
                  {#each data.tech_stack.load_balancers.filter(shouldIncludeItem) as v}
                    <span class="badge badge-ghost badge-sm"
                      >{v.toLowerCase()}</span
                    >
                  {/each}
                </div>
              </div>
            {/if}

            {#if data.tech_stack?.others}
              <div class="mb-2">
                <div class="text-xs text-muted">Frameworks / other</div>
                <div class="mt-1 flex flex-wrap gap-2">
                  {#each data.tech_stack.others
                    .filter(shouldIncludeItem)
                    .slice(0, 10) as v}
                    <span class="badge badge-ghost badge-sm"
                      >{v.toLowerCase()}</span
                    >
                  {/each}
                  {#if data.tech_stack.others.filter(shouldIncludeItem).length > 10}
                    <span class="badge badge-ghost badge-sm opacity-60">
                      +{data.tech_stack.others.filter(shouldIncludeItem)
                        .length - 10} more
                    </span>
                  {/if}
                </div>
              </div>
            {/if}

            {#if data.tech_stack?.tags}
              <div class="mb-2">
                <div class="text-xs text-muted">Tags</div>
                <div class="mt-1 flex flex-wrap gap-2">
                  {#each data.tech_stack.tags.filter(shouldIncludeItem) as v}
                    <span class="badge badge-outline badge-sm"
                      >{v.toLowerCase()}</span
                    >
                  {/each}
                </div>
              </div>
            {/if}
          </div>

          <!-- repo button bottom-left inside details modal -->
          <div class="mt-6">
            {#if data.source_code_repo}
              <a
                class="btn btn-sm btn-outline"
                href={data.source_code_repo}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Abrir repositório de ${data.submission_id || data.user?.name}`}
              >
                repo
              </a>
            {/if}
            {#if data.commits_count || data.first_commit || data.last_commit}
              <div class="text-xs text-muted mt-2">
                {#if data.commits_count}<div>
                    Commits: {data.commits_count}
                  </div>{/if}
                {#if data.first_commit}<div>
                    first: {data.first_commit}
                  </div>{/if}
                {#if data.last_commit}<div>
                    last: {data.last_commit}
                  </div>{/if}
              </div>
            {/if}
          </div>
        </div>

        <div class="w-2/3">
          <div class="flex justify-between items-start mb-2">
            <h3 class="font-bold text-lg">
              {data.user?.name} — {data.submission_id}
            </h3>
            <div class="ml-4">
              <div
                class="w-20 h-20 rounded-full flex items-center justify-center font-black text-5xl"
                style="border: 4px solid {rankBorderColor(
                  data.rank,
                )}; color: {data.rank && data.rank > 3
                  ? '#000'
                  : rankBorderColor(data.rank)};"
                aria-hidden="true"
                title={`Rank ${data.rank}`}
              >
                #{data.rank || "-"}
              </div>
              {#if data.performance_rank}
                <div class="text-sm text-center mt-1">
                  perf #{data.performance_rank}
                </div>
              {/if}
            </div>
          </div>

          <section class="mb-4">
            <h4 class="font-semibold">Performance</h4>
            <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              <Metric
                label="p99 (ms)"
                value={performanceP99}
                description={metricsDescriptions["results.performance.p99"]}
              />
              <Metric
                label="Max requests"
                value={performanceMaxRequests}
                description={metricsDescriptions[
                  "results.performance.max_requests"
                ]}
              />
              <Metric
                label="Num pagamentos solicitados"
                value={performanceNumPagamentos}
                description={metricsDescriptions[
                  "results.performance.num_pagamentos_solicitados"
                ]}
              />

              <Metric
                label="Lag"
                value={performanceLag}
                description={metricsDescriptions["results.performance.lag"]}
              />
            </div>

            <h4 class="font-semibold mt-4">Financeiro</h4>
            <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              <Metric
                label="Total líquido"
                value={financialTotalLiquido}
                description={metricsDescriptions[
                  "results.financeiro.total_liquido"
                ]}
                valueClass="text-success"
              />
              <Metric
                label="Total bruto"
                value={financialTotalBruto}
                description={metricsDescriptions[
                  "results.financeiro.total_bruto"
                ]}
              />
              <Metric
                label="Total taxas"
                value={financialTotalTaxas}
                description={metricsDescriptions[
                  "results.financeiro.total_taxas"
                ]}
                valueClass="text-warning"
              />
              <div class="col-span-2">
                <div class="flex gap-2 items-center flex-wrap">
                  <div class="badge {multa ? 'badge-error' : 'badge-ghost'}">
                    Multa {multaPercentage}% ({multaTotal})
                  </div>
                  <div class="badge {bonus ? 'badge-success' : 'badge-ghost'}">
                    Bônus {bonusPercentage}% ({bonusTotal})
                  </div>
                </div>
              </div>

              <div class="col-span-2 mt-2">
                <div class="flex items-center gap-2">
                  <div class="text-sm text-muted">Caixa dois</div>
                  <div
                    class={"badge ml-2 " +
                      (caixaDois ? "badge-error" : "badge-success")}
                  >
                    {caixaDois ? "sim" : "não"}
                  </div>
                </div>
              </div>
            </div>

            <h4 class="font-semibold mt-4">Pagamentos</h4>

            <!-- Original Data Metrics -->
            <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              <Metric
                label="Default - total bruto"
                value={defaultTotalBruto}
                description={metricsDescriptions[
                  "results.pagamentos.default_total_bruto"
                ]}
              />
              <Metric
                label="Default - num pagamentos"
                value={defaultNumPagamentos}
                description={metricsDescriptions[
                  "results.pagamentos.default_num_pagamentos"
                ]}
              />
              <Metric
                label="Default - total taxas"
                value={defaultTotalTaxas}
                description={metricsDescriptions[
                  "results.pagamentos.default_total_taxas"
                ]}
              />
              <Metric
                label="Fallback - total bruto"
                value={fallbackTotalBruto}
                description={metricsDescriptions[
                  "results.pagamentos.fallback_total_bruto"
                ]}
              />
              <Metric
                label="Fallback - num pagamentos"
                value={fallbackNumPagamentos}
                description={metricsDescriptions[
                  "results.pagamentos.fallback_num_pagamentos"
                ]}
              />
              <Metric
                label="Fallback - total taxas"
                value={fallbackTotalTaxas}
                description={metricsDescriptions[
                  "results.pagamentos.fallback_total_taxas"
                ]}
              />
            </div>

            <!-- Visual Distribution Charts -->
            <h5 class="text-sm font-medium mb-4">Distribuição Visual</h5>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <!-- Total Bruto Distribution -->
              <div class="flex flex-col items-center">
                <h6 class="text-xs font-medium mb-2">
                  Distribuição Total Bruto
                </h6>
                <div class="relative w-24 h-24">
                  <svg
                    class="w-24 h-24 transform -rotate-90"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      fill="none"
                      stroke="#e5e7eb"
                      stroke-width="2"
                    />
                    {#if defaultBrutoPercentage > 0}
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        fill="none"
                        stroke="#10b981"
                        stroke-width="2"
                        stroke-dasharray={`${(defaultBrutoPercentage / 100) * 62.83} 62.83`}
                        stroke-dashoffset="0"
                      />
                    {/if}
                    {#if fallbackBrutoPercentage > 0}
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        fill="none"
                        stroke="#f59e0b"
                        stroke-width="2"
                        stroke-dasharray={`${(fallbackBrutoPercentage / 100) * 62.83} 62.83`}
                        stroke-dashoffset={`-${(defaultBrutoPercentage / 100) * 62.83}`}
                      />
                    {/if}
                  </svg>
                  <div
                    class="absolute inset-0 flex items-center justify-center"
                  >
                    <span class="text-xs font-bold"
                      >{Math.round(defaultBrutoPercentage)}%</span
                    >
                  </div>
                </div>
                <div class="text-xs text-center mt-2 space-y-1">
                  <div class="flex items-center gap-1">
                    <div class="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span>Default ({Math.round(defaultBrutoPercentage)}%)</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <div class="w-2 h-2 bg-amber-500 rounded-full"></div>
                    <span
                      >Fallback ({Math.round(fallbackBrutoPercentage)}%)</span
                    >
                  </div>
                </div>
              </div>

              <!-- Número de Pagamentos Distribution -->
              <div class="flex flex-col items-center">
                <h6 class="text-xs font-medium mb-2">
                  Distribuição Num. Pagamentos
                </h6>
                <div class="relative w-24 h-24">
                  <svg
                    class="w-24 h-24 transform -rotate-90"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      fill="none"
                      stroke="#e5e7eb"
                      stroke-width="2"
                    />
                    {#if defaultNumPercentage > 0}
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        fill="none"
                        stroke="#3b82f6"
                        stroke-width="2"
                        stroke-dasharray={`${(defaultNumPercentage / 100) * 62.83} 62.83`}
                        stroke-dashoffset="0"
                      />
                    {/if}
                    {#if fallbackNumPercentage > 0}
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        fill="none"
                        stroke="#ef4444"
                        stroke-width="2"
                        stroke-dasharray={`${(fallbackNumPercentage / 100) * 62.83} 62.83`}
                        stroke-dashoffset={`-${(defaultNumPercentage / 100) * 62.83}`}
                      />
                    {/if}
                  </svg>
                  <div
                    class="absolute inset-0 flex items-center justify-center"
                  >
                    <span class="text-xs font-bold"
                      >{Math.round(defaultNumPercentage)}%</span
                    >
                  </div>
                </div>
                <div class="text-xs text-center mt-2 space-y-1">
                  <div class="flex items-center gap-1">
                    <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Default ({Math.round(defaultNumPercentage)}%)</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <div class="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span>Fallback ({Math.round(fallbackNumPercentage)}%)</span>
                  </div>
                </div>
              </div>

              <!-- Total Taxas Distribution -->
              <div class="flex flex-col items-center">
                <h6 class="text-xs font-medium mb-2">
                  Distribuição Total Taxas
                </h6>
                <div class="relative w-24 h-24">
                  <svg
                    class="w-24 h-24 transform -rotate-90"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      fill="none"
                      stroke="#e5e7eb"
                      stroke-width="2"
                    />
                    {#if defaultTaxasPercentage > 0}
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        fill="none"
                        stroke="#8b5cf6"
                        stroke-width="2"
                        stroke-dasharray={`${(defaultTaxasPercentage / 100) * 62.83} 62.83`}
                        stroke-dashoffset="0"
                      />
                    {/if}
                    {#if fallbackTaxasPercentage > 0}
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        fill="none"
                        stroke="#ec4899"
                        stroke-width="2"
                        stroke-dasharray={`${(fallbackTaxasPercentage / 100) * 62.83} 62.83`}
                        stroke-dashoffset={`-${(defaultTaxasPercentage / 100) * 62.83}`}
                      />
                    {/if}
                  </svg>
                  <div
                    class="absolute inset-0 flex items-center justify-center"
                  >
                    <span class="text-xs font-bold"
                      >{Math.round(defaultTaxasPercentage)}%</span
                    >
                  </div>
                </div>
                <div class="text-xs text-center mt-2 space-y-1">
                  <div class="flex items-center gap-1">
                    <div class="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Default ({Math.round(defaultTaxasPercentage)}%)</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <div class="w-2 h-2 bg-pink-500 rounded-full"></div>
                    <span
                      >Fallback ({Math.round(fallbackTaxasPercentage)}%)</span
                    >
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div class="modal-action">
            <button class="btn" on:click={() => (open = false)}>fechar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
