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
      },
      pagamentos: {
        default_total_bruto: 600000,
        default_num_pagamentos: 60000,
        default_total_taxas: 50000,
        fallback_total_bruto: 400000,
        fallback_total_taxas: 150000,
        fallback_num_pagamentos: 40000,
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
  $: caixaDois = data?.results?.financeiro?.caixa_dois;

  // Payment metrics
  $: defaultTotalBruto = formatCurrency(
    data?.results?.pagamentos?.default_total_bruto || 0,
  );
  $: defaultNumPagamentos =
    data?.results?.pagamentos?.default_num_pagamentos ?? "-";
  $: fallbackTotalBruto = formatCurrency(
    data?.results?.pagamentos?.fallback_total_bruto || 0,
  );
  $: fallbackNumPagamentos =
    data?.results?.pagamentos?.fallback_num_pagamentos ?? 0;

  // Tech stack icons - collect all items except tags and deduplicate
  $: allTechItems = [
    ...(data.tech_stack?.languages || []),
    ...(data.tech_stack?.runtimes || []),
    ...(data.tech_stack?.storages || []),
    ...(data.tech_stack?.messaging || []),
    ...(data.tech_stack?.load_balancers || []),
    ...(data.tech_stack?.others || []),
  ].filter(Boolean); // Remove any falsy values

  $: techIcons = Array.from(new Set(allTechItems)) // Deduplicate using Set
    .map((item) => ({
      name: item,
      svg: getIconSvg(item, "w-8 h-8"),
    }))
    .filter((icon) => icon.svg); // Only include items that have icons

  // Language icon for collapsed view
  $: languageIcon =
    primaryLanguage !== "-" ? getIconSvg(primaryLanguage, "w-12 h-12") : null;

  let bonus: boolean = data.results && data?.results?.financeiro.bonus > 0;
  let multa: boolean =
    data.results && data?.results?.financeiro.multa_total > 0;
  let open = false;
</script>

<article
  class="card bg-base-200 shadow-md hover:shadow-lg transition-shadow duration-150 relative px-6 py-5 min-w-[18rem]"
  style={data.rank && data.rank <= 3
    ? `border: 2px solid ${rankBorderColor(data.rank)};`
    : ""}
>
  {#if data.rank && data.rank <= 3}
    <div class="absolute -top-3 left-3">
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
  <div class="card-body p-0 flex flex-col h-full">
    <!-- person name full row -->
    <div class="text-xl font-bold">{data.user?.name}</div>
    <!-- subtitle as submission id / participant -->
    <div class="text-sm text-muted mb-4">{data.submission_id}</div>

    <!-- icon left, amount + p99 right -->
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <div class="w-20 flex items-center justify-center">
          {#if languageIcon}
            {@html languageIcon}
          {:else}
            <div
              class="w-12 h-12 bg-base-300 rounded flex items-center justify-center text-xl font-bold"
            >
              {primaryLanguage.charAt(0).toUpperCase()}
            </div>
          {/if}
        </div>
      </div>

      <div class="text-right">
        <div class="text-2xl font-bold">
          R$ {formattedTotalLiquido}
        </div>
        <div class="text-sm text-muted">
          p99: {p99} ms
        </div>
      </div>
    </div>

    <!-- compact tag badges (no labels) -->
    <div class="mt-4 flex items-center gap-2">
      <span class="badge badge-primary">{primaryLanguage.toLowerCase()}</span>
      <span class="badge badge-secondary">{primaryRuntime.toLowerCase()}</span>
      <span class="badge badge-accent">{primaryStorage.toLowerCase()}</span>
    </div>

    <!-- fixed action at bottom -->
    <div class="mt-auto flex justify-end">
      <button class="btn btn-sm btn-outline" on:click={() => (open = true)}
        >detalhes</button
      >
    </div>
  </div>

  <!-- Modal with full details -->
  {#if open}
    <div class="modal modal-open">
      <div class="modal-box max-w-4xl">
        <div class="flex gap-6">
          <div class="w-1/3">
            <UserCard
              repoUrl={data.source_code_repo ?? "-"}
              name={data.user?.name}
              avatarUrl={data.user?.github_profile_pic ?? "-"}
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
                  <div class="flex gap-2 items-center">
                    <div class="badge {multa ? 'badge-error' : 'badge-ghost'}">
                      Multa {multaPercentage}% ({multaTotal})
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
              <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
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
              </div>
            </section>

            <div class="modal-action">
              <button class="btn" on:click={() => (open = false)}>fechar</button
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</article>
