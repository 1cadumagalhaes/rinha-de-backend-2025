<script lang="ts">
  import * as icons from "simple-icons";
  import UserCard from "$lib/components/UserCard.svelte";
  import Metric from "$lib/components/Metric.svelte";
  import { getByParticipant } from "$lib/utils/submissions";

  export let submission: any = {};

  const sample = {
    language: "javascript",
    participante: "team-x",
    nome: "Fulano de Tal",
    total_liquido: 1234,
    p99: "1200ms",
    runtime: "node",
    storages: ["redis"],
    messaging: [],
    rank: undefined,
    repo_url: null,
  };

  let data = { ...sample, ...submission };

  $: data = { ...sample, ...submission };

  // normalized repo URL for use both in the mini card and modal
  $: repoUrl =
    data.repo_url ||
    data.tech?.repo_url ||
    data.info?.["source-code-repo"] ||
    null;

  let langIcon: any = null;
  let storageIcons: any[] = [];
  let open = false;

  function compactNumber(n: number) {
    if (n == null || Number.isNaN(n)) return "-";
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return Math.round(n / 1_000_000) + "M";
    if (abs >= 1_000) return Math.round(n / 1_000) + "K";
    return String(Math.round(n));
  }

  function stripMs(v: any) {
    if (v == null) return "-";
    return String(v).replace(/ms$/i, "");
  }

  function formatNumberLocale(n: number | string | null | undefined) {
    if (n == null || n === "") return "-";
    const num =
      typeof n === "string"
        ? Number(String(n).replace(/[^0-9.-]+/g, ""))
        : Number(n);
    if (Number.isNaN(num)) return String(n);
    return num.toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatCurrency(n: number | string | null | undefined) {
    if (n == null || n === "") return "-";
    return `R$ ${formatNumberLocale(n)}`;
  }

  function stripMsVal(v: any) {
    if (!v && v !== 0) return null;
    const s = String(v);
    const without = s.replace(/\s*ms\s*$/i, "");
    const n = Number(without);
    return Number.isNaN(n) ? without : n;
  }

  function formatInteger(n: number | string | null | undefined) {
    if (n == null || n === "") return "-";
    const num =
      typeof n === "string"
        ? Number(String(n).replace(/[^0-9-]+/g, ""))
        : Number(n);
    if (Number.isNaN(num)) return String(n);
    return Math.round(num).toLocaleString("de-DE");
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
    if (ico) {
      const label = esc(String(name));
      return `<svg class=\"w-6 h-6\" role=\"img\" aria-label=\"${label}\" viewBox=\"0 0 24 24\" fill=\"currentColor\" style=\"color:#${ico.hex}\"><title>${label}</title><path d=\"${ico.path}\"/></svg>`;
    }

    const slugMap: Record<string, string> = {
      java: "/icons/java.svg",
      csharp: "/icons/csharp.svg",
      c: "/icons/c.svg",
      cpp: "/icons/cpp.svg",
      cplus: "/icons/cpp.svg",
      cplusplus: "/icons/cpp.svg",
      assembly: "/icons/assembly.png",
      asm: "/icons/assembly.png",
    };

    const img = slugMap[slug];
    if (img) {
      const label = esc(String(name));
      return `<img src=\"${img}\" alt=\"${label}\" class=\"w-6 h-6 object-contain\"/>`;
    }

    return null;
  }

  function buildTechList(res: any) {
    if (!res) return [];
    const out: string[] = [];
    // helper to push unique values
    function pushMany(arr: any) {
      if (!arr) return;
      for (const v of Array.isArray(arr) ? arr : [arr]) {
        if (!v) continue;
        const s = String(v).trim();
        if (!out.includes(s)) out.push(s);
      }
    }

    // prefer detected, then provided, then info
    pushMany(
      res.tech?.detected?.language ??
        res.tech?.provided?.langs ??
        res.info?.langs,
    );
    pushMany(
      res.tech?.detected?.runtime ??
        res.tech?.provided?.runtime ??
        res.info?.runtime,
    );
    pushMany(
      res.tech?.detected?.storage ??
        res.tech?.provided?.storages ??
        res.info?.storages,
    );
    pushMany(
      res.tech?.detected?.messaging ??
        res.tech?.provided?.messaging ??
        res.info?.messaging,
    );
    pushMany(
      res.tech?.detected?.load_balancers ??
        res.tech?.provided?.load_balancers ??
        res.info?.["load-balancers"],
    );
    pushMany(
      res.tech?.detected?.frameworks ??
        res.tech?.provided?.frameworks ??
        res.info?.["other-technologies"],
    );
    // fallback to any listed in info
    pushMany(res.info?.["other-technologies"]);

    return out;
  }

  function languageSlug(l: string) {
    if (!l) return "";
    const s = l.toLowerCase();
    if (s === "c#" || s === "csharp" || s === "dotnet") return "csharp";
    return s.replace(/\+/g, "plus").replace(/#/g, "sharp");
  }

  function rankBorderColor(rank: number | undefined) {
    if (!rank) return null;
    if (rank === 1) return "#f59e0b";
    if (rank === 2) return "#9ca3af";
    return "#b87333";
  }

  function resolveRank(r: any) {
    if (!r) return null;
    if (r.rank) return r.rank;
    if (r.resultado_final?.rank) return r.resultado_final.rank;
    if (Array.isArray(r.highlights) && r.highlights.length) {
      const found =
        r.highlights.find((h: any) => h.participant === r.participant) ||
        r.highlights[0];
      if (found && found.rank) return found.rank;
    }
    return null;
  }

  function findIconFor(slug: string) {
    const key =
      "si" + slug.replace(/(^.|-.)/g, (m) => m.replace("-", "").toUpperCase());
    const anyIcons: any = icons;
    const ico = anyIcons[key] ?? null;
    if (ico) return ico;
    // fallback to local static icons for some langs
    if (slug === "java")
      return { path: null, imgSrc: "/icons/java.svg", hex: null };
    if (slug === "csharp")
      return { path: null, imgSrc: "/icons/csharp.svg", hex: null };
    if (slug === "c") return { path: null, imgSrc: "/icons/c.svg", hex: null };
    if (slug === "cpp" || slug === "cplus" || slug === "cplusplus")
      return { path: null, imgSrc: "/icons/cpp.svg", hex: null };
    if (slug === "assembly" || slug === "asm")
      return { path: null, imgSrc: "/icons/assembly.png", hex: null };
    return null;
  }

  // try to extract a GitHub owner/user from common repo URL patterns
  function parseGithubOwner(url: string | undefined | null) {
    if (!url) return null;
    try {
      const s = String(url).trim();
      // git@github.com:owner/repo.git
      const sshMatch = s.match(/git@github\.com:([^\/\s]+)\//i);
      if (sshMatch && sshMatch[1]) return `https://github.com/${sshMatch[1]}`;
      // https://github.com/owner[/repo...]
      const httpMatch = s.match(
        /https?:\/\/(?:www\.)?github\.com\/([^\/\s]+)/i,
      );
      if (httpMatch && httpMatch[1])
        return `https://github.com/${httpMatch[1]}`;
      return null;
    } catch (e) {
      return null;
    }
  }

  function gatherSocials(res: any) {
    const out: string[] = [];
    const fromInfo = Array.isArray(res.info?.social)
      ? res.info.social.slice()
      : [];
    for (const s of fromInfo) if (s) out.push(s);

    // prefer explicit repo_owner_url
    if (res.tech?.repo_owner_url) {
      out.unshift(res.tech.repo_owner_url);
    } else {
      // try repo urls
      const ownerFromTech = parseGithubOwner(res.tech?.repo_url);
      const ownerFromInfo = parseGithubOwner(res.info?.["source-code-repo"]);
      const ownerFromData = parseGithubOwner(repoUrl);
      const candidate = ownerFromTech || ownerFromInfo || ownerFromData;
      if (candidate) out.unshift(candidate);
    }

    // dedupe while preserving order
    const seen = new Set<string>();
    return out.filter((x) => {
      if (!x) return false;
      if (seen.has(x)) return false;
      seen.add(x);
      return true;
    });
  }

  // recompute icons whenever the resolved `data` changes
  $: {
    const slug = languageSlug(data.language || "");
    langIcon = findIconFor(slug);

    storageIcons = (
      Array.isArray(data.storages) ? data.storages : [data.storages]
    )
      .filter(Boolean)
      .map((s: string) => findIconFor(String(s).toLowerCase()));
  }
</script>

<article
  class="card bg-base-200 shadow-md hover:shadow-lg transition-shadow duration-150 relative p-4 min-w-[18rem]"
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
  <div class="card-body p-4 flex flex-col h-full">
    <!-- person name full row -->
    <div class="text-xl font-bold">{data.nome || data.name}</div>
    <!-- subtitle as submission name / participant -->
    <div class="text-sm text-muted mb-4">
      {data.participante || data.participant}
    </div>

    <!-- icon left, amount + p99 right -->
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <div class="w-20 flex items-center justify-center">
          {#if langIcon?.path}
            <svg
              class="w-16 h-10"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              style={langIcon.hex ? `color: #${langIcon.hex}` : ""}
            >
              <path d={langIcon.path} fill="currentColor"></path>
            </svg>
          {:else if langIcon?.imgSrc}
            <img
              src={langIcon.imgSrc}
              alt={data.language || "lang"}
              class="w-16 h-10 object-contain"
            />
          {:else}
            <div class="text-2xl">
              {data.language ? data.language[0].toUpperCase() : "?"}
            </div>
          {/if}
        </div>
      </div>

      <div class="text-right">
        <div class="text-2xl font-bold">
          R$ {compactNumber(Number(data.total_liquido))}
        </div>
        <div class="text-sm text-muted">
          p99: {#if typeof stripMsVal(data.p99) === "number"}{stripMsVal(
              data.p99,
            )} ms{:else}{stripMsVal(data.p99)}{/if}
        </div>
      </div>
    </div>

    <!-- compact tag badges (no labels) -->
    <div class="mt-4 flex items-center gap-2">
      <span class="badge badge-primary">{data.language || "-"}</span>
      <span class="badge badge-secondary">{data.runtime || "-"}</span>
      <span class="badge badge-accent"
        >{(data.storages && data.storages[0]) || "-"}</span
      >
    </div>

    <!-- repo button is shown only in the details modal (bottom-left) -->

    <!-- fixed action at bottom -->
    <div class="mt-auto flex justify-end">
      <button class="btn btn-sm btn-outline" on:click={() => (open = true)}
        >detalhes</button
      >
    </div>
  </div>

  <!-- Modal with full details -->
  {#if open}
    {#await Promise.resolve(getByParticipant(data.participant || data.participante)) then res}
      {#if res}
        <div class="modal modal-open">
          <div class="modal-box max-w-4xl">
            <div class="flex gap-6">
              <div class="w-1/3">
                <UserCard
                  repoUrl={res.tech?.repo_url || res.info?.["source-code-repo"]}
                  name={res.name || res.info?.name}
                  avatarUrl={res.tech?.repo_owner_avatar || res.info?.avatar}
                  socials={gatherSocials(res)}
                />

                <!-- icons only (omit items without an SVG) -->
                <div class="mt-4">
                  <div class="flex flex-wrap gap-2">
                    {#each buildTechList(res) as t}
                      {#if getIconSvg(t)}
                        {@html getIconSvg(t)}
                      {/if}
                    {/each}
                  </div>
                </div>

                <!-- Tech stack tags (below icons) - badges only, skip empty categories -->
                <div class="mt-4">
                  {#if res.tech?.detected?.language || res.tech?.provided?.langs || res.info?.langs}
                    <div class="mb-2">
                      <div class="text-xs text-muted">Language</div>
                      <div class="mt-1 flex flex-wrap gap-2">
                        {#each res.tech?.detected?.language ? [res.tech.detected.language] : res.tech?.provided?.langs || res.info?.langs || [] as v}
                          {#if v}
                            <span class="badge badge-primary badge-sm">{v}</span
                            >
                          {/if}
                        {/each}
                      </div>
                    </div>
                  {/if}

                  {#if res.tech?.detected?.runtime || res.tech?.provided?.runtime || res.info?.runtime}
                    <div class="mb-2">
                      <div class="text-xs text-muted">Runtime</div>
                      <div class="mt-1 flex flex-wrap gap-2">
                        {#each res.tech?.detected?.runtime ? [res.tech.detected.runtime] : res.tech?.provided?.runtime ? [res.tech.provided.runtime] : res.info?.runtime ? [res.info.runtime] : [] as v}
                          {#if v}
                            <span class="badge badge-secondary badge-sm"
                              >{v}</span
                            >
                          {/if}
                        {/each}
                      </div>
                    </div>
                  {/if}

                  {#if res.tech?.detected?.storage || res.tech?.provided?.storages || res.info?.storages}
                    <div class="mb-2">
                      <div class="text-xs text-muted">Storage</div>
                      <div class="mt-1 flex flex-wrap gap-2">
                        {#each res.tech?.detected?.storage || res.tech?.provided?.storages || res.info?.storages || [] as v}
                          {#if v}
                            <span class="badge badge-accent badge-sm">{v}</span>
                          {/if}
                        {/each}
                      </div>
                    </div>
                  {/if}

                  {#if res.tech?.detected?.messaging || res.tech?.provided?.messaging || res.info?.messaging}
                    <div class="mb-2">
                      <div class="text-xs text-muted">Messaging</div>
                      <div class="mt-1 flex flex-wrap gap-2">
                        {#each res.tech?.detected?.messaging || res.tech?.provided?.messaging || res.info?.messaging || [] as v}
                          {#if v}
                            <span class="badge badge-info badge-sm">{v}</span>
                          {/if}
                        {/each}
                      </div>
                    </div>
                  {/if}

                  {#if res.tech?.detected?.load_balancers || res.tech?.provided?.load_balancers || res.info?.["load-balancers"]}
                    <div class="mb-2">
                      <div class="text-xs text-muted">Load balancers</div>
                      <div class="mt-1 flex flex-wrap gap-2">
                        {#each res.tech?.detected?.load_balancers || res.tech?.provided?.load_balancers || res.info?.["load-balancers"] || [] as v}
                          {#if v}
                            <span class="badge badge-ghost badge-sm">{v}</span>
                          {/if}
                        {/each}
                      </div>
                    </div>
                  {/if}

                  {#if res.tech?.detected?.frameworks || res.tech?.provided?.frameworks || res.info?.["other-technologies"]}
                    <div class="mb-2">
                      <div class="text-xs text-muted">Frameworks / other</div>
                      <div class="mt-1 flex flex-wrap gap-2">
                        {#each res.tech?.detected?.frameworks || res.tech?.provided?.frameworks || res.info?.["other-technologies"] || [] as v}
                          {#if v}
                            <span class="badge badge-ghost badge-sm">{v}</span>
                          {/if}
                        {/each}
                      </div>
                    </div>
                  {/if}
                </div>

                <!-- repo button bottom-left inside details modal -->
                <div class="mt-6">
                  {#if res.tech?.repo_url || res.info?.["source-code-repo"] || repoUrl}
                    <a
                      class="btn btn-sm btn-outline"
                      href={res.tech?.repo_url ||
                        res.info?.["source-code-repo"] ||
                        repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Abrir repositório de ${res.participant}`}
                    >
                      repo
                    </a>
                  {/if}
                </div>
              </div>

              <div class="w-2/3">
                <div class="flex justify-between items-start mb-2">
                  <h3 class="font-bold text-lg">
                    {res.name} — {res.participant}
                  </h3>
                  {#if resolveRank(res)}
                    <div class="ml-4">
                      <div
                        class="w-20 h-20 rounded-full flex items-center justify-center font-black text-5xl"
                        style="border: 4px solid {rankBorderColor(
                          resolveRank(res),
                        )}; color: {resolveRank(res) && resolveRank(res) > 3
                          ? '#000'
                          : rankBorderColor(resolveRank(res))};"
                        aria-hidden="true"
                        title={`Rank ${resolveRank(res)}`}
                      >
                        #{resolveRank(res)}
                      </div>
                    </div>
                  {/if}
                </div>

                <section class="mb-4">
                  <h4 class="font-semibold">Performance</h4>
                  <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Metric
                      label="p99 (ms)"
                      value={formatNumberLocale(
                        stripMsVal(res.resultado_final?.p99?.valor),
                      )}
                      description={res.resultado_final?.p99?.descricao}
                    />
                    <Metric
                      label="p99 max_requests"
                      value={formatInteger(
                        res.resultado_final?.p99?.max_requests ?? "-",
                      )}
                      description={res.resultado_final?.p99?.descricao}
                    />
                    <Metric
                      label="Num pagamentos total"
                      value={formatInteger(
                        res.resultado_final?.lag?.num_pagamentos_total,
                      )}
                      description={res.resultado_final?.lag?.descricao}
                    />

                    <Metric
                      label="Lag"
                      value={formatInteger(res.resultado_final?.lag?.lag)}
                      description={res.resultado_final?.lag?.descricao}
                    />
                  </div>

                  <h4 class="font-semibold mt-4">Financeiro</h4>
                  <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Metric
                      label="Total líquido"
                      value={formatCurrency(res.resultado_final?.total_liquido)}
                      description={res.resultado_final?.descricao}
                      valueClass="text-success"
                    />
                    <Metric
                      label="Total bruto"
                      value={formatCurrency(res.resultado_final?.total_bruto)}
                      description={res.resultado_final?.descricao}
                    />
                    <Metric
                      label="Total taxas"
                      value={formatCurrency(res.resultado_final?.total_taxas)}
                      description={res.resultado_final?.descricao}
                      valueClass="text-warning"
                    />

                    {#if res.resultado_final}
                      <!-- bonus and multa calculations -->
                      {@html (() => {
                        const tl = Number(
                          res.resultado_final.total_liquido || 0,
                        );
                        const bonusStr =
                          res.resultado_final?.p99?.bonus || "0%";
                        const bonusFrac = (function (s) {
                          if (!s) return 0;
                          const st = String(s).trim();
                          if (st.endsWith("%"))
                            return Number(st.slice(0, -1)) / 100;
                          return Number(st) || 0;
                        })(bonusStr);
                        const bonusAmount = tl * bonusFrac;
                        const multaPerc = Number(
                          res.resultado_final?.multa?.porcentagem || 0,
                        );
                        const multaAmount = tl * (multaPerc || 0);
                        return `<div class=\"col-span-2\"><div class=\"flex gap-2 items-center\"><div class=\"badge ${bonusFrac ? "badge-success" : "badge-ghost"}\">Bônus ${bonusStr} (${formatCurrency(bonusAmount)})</div><div class=\"ml-2 badge ${multaPerc ? "badge-error" : "badge-ghost"}\">Multa ${multaPerc || 0}% (${formatCurrency(multaAmount)})</div></div></div>`;
                      })()}
                    {/if}

                    <div class="col-span-2 mt-2">
                      <div class="flex items-center gap-2">
                        <div class="text-sm text-muted">Caixa dois</div>
                        <div
                          class={"badge ml-2 " +
                            (res.resultado_final?.caixa_dois?.detectado
                              ? "badge-error"
                              : "badge-success")}
                        >
                          {res.resultado_final?.caixa_dois?.detectado
                            ? "sim"
                            : "não"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <h4 class="font-semibold mt-4">Pagamentos</h4>
                  <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Metric
                      label="Default - total bruto"
                      value={formatCurrency(
                        res.resultado_final?.pagamentos_realizados_default
                          ?.total_bruto,
                      )}
                      description={res.resultado_final
                        ?.pagamentos_realizados_default?.descricao}
                    />
                    <Metric
                      label="Default - num pagamentos"
                      value={formatInteger(
                        res.resultado_final?.pagamentos_realizados_default
                          ?.num_pagamentos,
                      )}
                      description={res.resultado_final
                        ?.pagamentos_realizados_default?.descricao}
                    />
                    <Metric
                      label="Fallback - total bruto"
                      value={formatCurrency(
                        res.resultado_final?.pagamentos_realizados_fallback
                          ?.total_bruto,
                      )}
                      description={res.resultado_final
                        ?.pagamentos_realizados_fallback?.descricao}
                    />
                    <Metric
                      label="Fallback - num pagamentos"
                      value={formatInteger(
                        res.resultado_final?.pagamentos_realizados_fallback
                          ?.num_pagamentos,
                      )}
                      description={res.resultado_final
                        ?.pagamentos_realizados_fallback?.descricao}
                    />
                  </div>
                </section>

                <div class="modal-action">
                  <button class="btn" on:click={() => (open = false)}
                    >fechar</button
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
      {:else}
        <div class="modal modal-open">
          <div class="modal-box">
            <p>
              Detalhes não encontrados para {data.participante ||
                data.participant}.
            </p>
            <div class="modal-action">
              <button class="btn" on:click={() => (open = false)}>fechar</button
              >
            </div>
          </div>
        </div>
      {/if}
    {/await}
  {/if}
</article>
