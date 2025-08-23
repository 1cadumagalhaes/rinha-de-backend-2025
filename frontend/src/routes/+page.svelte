<script lang="ts">
  import { goto } from "$app/navigation";
  import SubmissionCard from "$lib/components/SubmissionCard.svelte";
  import { getIconSvg } from "$lib/utils/icons";
  import highlights from "$lib/data/highlights.json";
  import { getByParticipant, search, getAll } from "$lib/utils/submissions";
  import type { SubmissionRecord } from "$lib/types/submission";
  import { browser } from "$app/environment";
  import { onMount } from "svelte";

  let chartAction: any = null;

  onMount(async () => {
    if (browser) {
      // @ts-ignore - No type definitions available for svelte-apexcharts
      const { chart } = await import("svelte-apexcharts");
      chartAction = chart;
    }
  });

  function scrollToContent() {
    const el = document.getElementById("main-content");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }

  // Get real submissions data
  const allSubmissions = getAll();

  // Top 3 winners based on total_liquido
  const top3 = (highlights.top3_total_liquido || [])
    .map((id: string) => getByParticipant(id))
    .filter((submission): submission is SubmissionRecord => submission !== null)
    .slice(0, 3);

  // Overall stats from highlights
  const totalParticipants = highlights.total_participants ?? 0;
  const totalSubmissions = highlights.total_submissions ?? 0;
  const languagesDist: Record<string, number> =
    highlights.language_distribution || {};
  const totalLanguages = Object.keys(languagesDist).filter(Boolean).length;

  // Top 3 languages for display
  const topLanguages = Object.entries(languagesDist)
    .map(([k, v]) => ({ language: k, count: v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Language distribution chart data
  const languageChartData = Object.entries(languagesDist)
    .map(([k, v]) => ({ language: k, count: v }))
    .sort((a, b) => b.count - a.count);

  // Submissions per day chart data
  const submissionsPerDay = highlights.submissions_per_day || {};
  const dailyChartData = Object.entries(submissionsPerDay)
    .map(([date, count]) => ({ date, count: count as number }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // ApexCharts configuration for language distribution
  const languageChartOptions = {
    chart: {
      type: "bar",
      height: 350,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "55%",
        borderRadius: 4,
      },
    },
    dataLabels: {
      enabled: false,
    },
    series: [
      {
        name: "Submissões",
        data: languageChartData.map((item) => item.count),
      },
    ],
    xaxis: {
      categories: languageChartData.map((item) => item.language),
      title: {
        text: "Linguagens",
      },
    },
    yaxis: {
      title: {
        text: "Número de submissões",
      },
    },
    colors: ["#f59e0b"], // Amber color that works in both themes
  };

  // Submissions per day chart configuration
  const dailyChartOptions = {
    chart: {
      type: "line",
      height: 350,
      toolbar: { show: false },
    },
    stroke: {
      curve: "smooth",
      width: 3,
    },
    series: [
      {
        name: "Submissões por dia",
        data: dailyChartData.map((item) => item.count),
      },
    ],
    xaxis: {
      type: "datetime",
      categories: dailyChartData.map((item) => item.date),
      title: {
        text: "Data",
      },
    },
    yaxis: {
      title: {
        text: "Número de submissões",
      },
    },
    colors: ["#8b5cf6"], // Purple color that works in both themes
  };

  // Honorable mentions
  const topP99Submission = highlights.top3_p99?.[0]
    ? getByParticipant(highlights.top3_p99[0])
    : null;
  const firstSubmission = highlights.first_submission?.submission_id
    ? getByParticipant(highlights.first_submission.submission_id)
    : null;
  const lastSubmission = highlights.last_submission?.submission_id
    ? getByParticipant(highlights.last_submission.submission_id)
    : null;
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

  <section
    id="main-content"
    class="min-h-[50vh] container mx-auto px-6 py-16 flex flex-col justify-center"
  >
    <div class="divider mb-36">
      <h2 class="text-4xl font-semibold text-center">Vencedores</h2>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 flex-1 items-center">
      {#each top3 as submission}
        <SubmissionCard {submission} />
      {/each}
    </div>
  </section>

  <section
    class="min-h-[50vh] container mx-auto px-6 py-16 flex flex-col justify-center"
  >
    <div class="max-w-6xl mx-auto w-full">
      <div class="divider mb-36">
        <h2 class="text-4xl font-semibold text-center">Análise geral</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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

      <!-- Top Languages Display -->
      <div class="text-center">
        <h3 class="text-2xl font-semibold mb-1">Linguagens mais usadas</h3>
        <div class="flex items-center justify-center gap-6 mt-4">
          {#each topLanguages as tl}
            <div
              class="card px-8 py-5 bg-base-200 flex flex-col items-center w-36"
            >
              <div class="mb-1">
                {@html getIconSvg(tl.language, "w-20 h-20") ||
                  '<div class="w-8 h-8 bg-base-300 rounded"></div>'}
              </div>
              <div class="font-semibold">{tl.language}</div>
              <div class="text-sm text-muted">{tl.count} submissões</div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </section>

  <section
    class="min-h-[50vh] container mx-auto px-6 py-16 flex flex-col justify-center"
  >
    <div class="max-w-6xl mx-auto w-full">
      <!-- Language Distribution Chart -->
      <div class="mb-8">
        <h3 class="text-2xl font-semibold mb-4 text-center">
          Distribuição por linguagem
        </h3>
        <div class="card bg-base-200 p-6">
          {#if chartAction}
            <div use:chartAction={languageChartOptions}></div>
          {:else}
            <div class="flex items-center justify-center h-80">
              <span class="loading loading-spinner loading-lg"></span>
            </div>
          {/if}
        </div>
      </div>

      <!-- Submissions per Day Chart -->
      {#if dailyChartData.length > 0}
        <div class="mb-8">
          <h3 class="text-2xl font-semibold mb-4 text-center">
            Submissões por dia
          </h3>
          <div class="card bg-base-200 p-6">
            {#if chartAction}
              <div use:chartAction={dailyChartOptions}></div>
            {:else}
              <div class="flex items-center justify-center h-80">
                <span class="loading loading-spinner loading-lg"></span>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </section>

  <section
    class="min-h-[50vh] container mx-auto px-6 py-16 flex flex-col justify-center"
  >
    <div class="max-w-2xl mx-auto w-full">
      <div class="divider mb-12">
        <h2 class="text-4xl font-semibold text-center">Menções honrosas</h2>
      </div>

      <div class="space-y-8 mb-8">
        <!-- Best Performance -->
        {#if topP99Submission}
          <div class="card bg-base-200 p-6">
            <div class="text-2xl font-semibold text-center mb-4">
              🏆 Melhor performance bruta (p99)
            </div>
            <SubmissionCard submission={topP99Submission} />
          </div>
        {/if}

        <!-- First Submission -->
        {#if firstSubmission}
          <div class="card bg-base-200 p-6">
            <div class="text-2xl font-semibold text-center mb-4">
              🥇 Primeira submissão
            </div>
            {#if highlights.first_submission?.date}
              <div class="text-center text-sm text-muted mb-3">
                {highlights.first_submission.date}
              </div>
            {/if}
            <SubmissionCard submission={firstSubmission} />
          </div>
        {/if}

        <!-- Last Submission -->
        {#if lastSubmission}
          <div class="card bg-base-200 p-6">
            <div class="text-2xl font-semibold text-center mb-4">
              🏁 Última submissão
            </div>
            {#if highlights.last_submission?.date}
              <div class="text-center text-sm text-muted mb-3">
                {highlights.last_submission.date}
              </div>
            {/if}
            <SubmissionCard submission={lastSubmission} />
          </div>
        {/if}
      </div>
    </div>
  </section>
</main>
