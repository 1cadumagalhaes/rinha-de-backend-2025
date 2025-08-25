<script lang="ts">
  import SubmissionCard from "$lib/components/SubmissionCard.svelte";
  import { getIconSvg } from "$lib/utils/icons";
  import highlights from "$lib/data/highlights.json";
  import { getByParticipant } from "$lib/utils/submissions";
  import type { SubmissionRecord } from "$lib/types/submission";

  let showMobileMenu = false;

  // Get the top performers per language from highlights data
  const topTotalLiquidoPerLanguage =
    highlights.top3_total_liquido_per_language || {};
  const topP99PerLanguage = highlights.top3_p99_per_language_liquido || {};

  // Get all languages that appear in either ranking
  const allLanguages = new Set([
    ...Object.keys(topTotalLiquidoPerLanguage),
    ...Object.keys(topP99PerLanguage),
  ]);

  // Sort languages alphabetically
  const sortedLanguages = Array.from(allLanguages).sort();

  function getSubmissionsForLanguage(
    language: string,
    type: "total" | "p99",
  ): SubmissionRecord[] {
    const source =
      type === "total" ? topTotalLiquidoPerLanguage : topP99PerLanguage;
    const submissionIds = (source as any)[language] || [];
    return submissionIds
      .map((id: string) => getByParticipant(id))
      .filter(
        (submission: any): submission is SubmissionRecord =>
          submission !== null,
      );
  }

  function formatLanguageName(language: string): string {
    const nameMap: Record<string, string> = {
      csharp: "C#",
      cpp: "C++",
      fsharp: "F#",
      javascript: "JavaScript",
      typescript: "TypeScript",
    };
    return (
      nameMap[language] || language.charAt(0).toUpperCase() + language.slice(1)
    );
  }

  function scrollToLanguage(language: string) {
    const element = document.getElementById(`language-${language}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      showMobileMenu = false; // Close mobile menu after navigation
    }
  }

  function toggleMobileMenu() {
    showMobileMenu = !showMobileMenu;
  }
</script>

<svelte:head>
  <title>Destaques - Rinha de Backend 2025</title>
  <meta
    name="description"
    content="Os melhores performances por linguagem na Rinha de Backend 2025"
  />
</svelte:head>

<div class="min-h-screen bg-base-100">
  <!-- Main Content with Sidebar -->
  <div class="flex">
    <!-- Sidebar Menu -->
    <aside
      class="w-64 bg-base-200 h-screen sticky top-0 self-start hidden lg:block overflow-y-auto"
    >
      <div class="p-6">
        <h3 class="text-lg font-semibold mb-4 sticky top-0 bg-base-200 pb-2">
          Linguagens
        </h3>
        <nav class="space-y-2">
          {#each sortedLanguages as language}
            {@const totalSubmissions = getSubmissionsForLanguage(
              language,
              "total",
            )}
            {@const p99Submissions = getSubmissionsForLanguage(language, "p99")}
            {#if totalSubmissions.length > 0 || p99Submissions.length > 0}
              <button
                on:click={() => scrollToLanguage(language)}
                class="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-base-300 transition-colors text-left"
              >
                <div class="flex-shrink-0">
                  {@html getIconSvg(language, "w-5 h-5")}
                </div>
                <span class="text-sm">{formatLanguageName(language)}</span>
              </button>
            {/if}
          {/each}
        </nav>
      </div>
    </aside>

    <!-- Mobile Menu Overlay -->
    {#if showMobileMenu}
      <div
        class="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        on:click={toggleMobileMenu}
        on:keydown={(e) => e.key === "Escape" && toggleMobileMenu()}
        role="button"
        tabindex="0"
        aria-label="Fechar menu"
      ></div>
      <aside
        class="fixed left-0 top-0 w-64 bg-base-200 h-full z-50 lg:hidden transform transition-transform"
      >
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold">Linguagens</h3>
            <button
              on:click={toggleMobileMenu}
              class="btn btn-sm btn-ghost"
              aria-label="Fechar menu"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>
          </div>
          <nav class="space-y-2">
            {#each sortedLanguages as language}
              {@const totalSubmissions = getSubmissionsForLanguage(
                language,
                "total",
              )}
              {@const p99Submissions = getSubmissionsForLanguage(
                language,
                "p99",
              )}
              {#if totalSubmissions.length > 0 || p99Submissions.length > 0}
                <button
                  on:click={() => scrollToLanguage(language)}
                  class="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-base-300 transition-colors text-left"
                >
                  <div class="flex-shrink-0">
                    {@html getIconSvg(language, "w-5 h-5")}
                  </div>
                  <span class="text-sm">{formatLanguageName(language)}</span>
                </button>
              {/if}
            {/each}
          </nav>
        </div>
      </aside>
    {/if}

    <!-- Mobile Menu Button -->
    <button
      on:click={toggleMobileMenu}
      class="fixed bottom-6 right-6 z-30 btn btn-primary btn-circle lg:hidden"
      aria-label="Abrir menu de navegação"
    >
      <svg
        class="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 6h16M4 12h16M4 18h16"
        ></path>
      </svg>
    </button>

    <!-- Main Content Area -->
    <main class="flex-1">
      <!-- Page Header -->
      <div class="bg-base-200 py-8">
        <div class="container mx-auto px-6">
          <h1 class="text-3xl md:text-4xl font-bold mb-2">
            🏆 Destaques por Linguagem
          </h1>
          <p class="text-base-content/70">
            Os melhores desempenhos de cada linguagem de programação na Rinha de
            Backend 2025
          </p>
        </div>
      </div>

      <!-- Language Sections -->
      <div class="space-y-16 py-8">
        {#each sortedLanguages as language}
          {@const totalSubmissions = getSubmissionsForLanguage(
            language,
            "total",
          )}
          {@const p99Submissions = getSubmissionsForLanguage(language, "p99")}
          {#if totalSubmissions.length > 0 || p99Submissions.length > 0}
            <section
              id="language-{language}"
              class="min-h-[50vh] container mx-auto px-6 py-16 flex flex-col justify-center scroll-mt-8"
            >
              <div class="divider mb-12">
                <div class="flex items-center gap-4">
                  <div class="flex-shrink-0">
                    {@html getIconSvg(language, "w-8 h-8")}
                  </div>
                  <h2 class="text-4xl font-semibold">
                    {formatLanguageName(language)}
                  </h2>
                </div>
              </div>

              <!-- Total Liquido Subsection -->
              {#if totalSubmissions.length > 0}
                <div class="mb-12">
                  <h3 class="text-2xl font-semibold mb-6 text-center">
                    💰 Melhor resultado
                  </h3>
                  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {#each totalSubmissions as submission}
                      <SubmissionCard {submission} />
                    {/each}
                  </div>
                </div>
              {/if}

              <!-- P99 Liquido Subsection -->
              {#if p99Submissions.length > 0}
                <div class="mb-8">
                  <h3 class="text-2xl font-semibold mb-6 text-center">
                    ⚡ Melhor performance
                  </h3>
                  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {#each p99Submissions as submission}
                      <SubmissionCard {submission} />
                    {/each}
                  </div>
                </div>
              {/if}
            </section>
          {/if}
        {/each}
      </div>

      {#if sortedLanguages.length === 0}
        <section
          class="min-h-[50vh] container mx-auto px-6 py-16 flex flex-col justify-center"
        >
          <div class="text-center py-12">
            <div class="text-6xl mb-4">🤔</div>
            <h2 class="text-2xl font-bold mb-2">Nenhum destaque encontrado</h2>
            <p class="text-base-content/70">
              Não foi possível carregar os destaques por linguagem.
            </p>
          </div>
        </section>
      {/if}
    </main>
  </div>
</div>
