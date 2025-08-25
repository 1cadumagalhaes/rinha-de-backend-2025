<script lang="ts">
	import { onMount } from "svelte";
	import { themeChange } from "theme-change";
	// favicon.ico placed in src/lib/assets; reference by path to avoid importing binary
	const favicon = "/src/lib/assets/favicon.ico";
	import "../app.css";
	let { children } = $props();

	import { isNightStore } from "$lib/stores/theme";

	onMount(() => {
		themeChange(false);
		const stored =
			typeof localStorage !== "undefined"
				? localStorage.getItem("rinha-theme")
				: null;
		if (stored === "night") isNightStore.set(true);
		const initial = stored === "night" ? "night" : "winter";
		document.documentElement.setAttribute("data-theme", initial);
		if (typeof localStorage !== "undefined")
			localStorage.setItem("rinha-theme", initial);

		isNightStore.subscribe((val) => updateTheme(val));
		// keep subscription for the lifetime of the layout
	});

	function updateTheme(isNight: boolean) {
		if (typeof window === "undefined") return;
		const theme = isNight ? "night" : "winter";
		document.documentElement.setAttribute("data-theme", theme);
		localStorage.setItem("rinha-theme", theme);
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#ffffff" />
</svelte:head>

<div class="min-h-screen">
	<nav class="w-full bg-base-200 py-3 sticky top-0 z-40">
		<div class="container mx-auto px-6">
			<div class="flex items-center justify-between gap-3">
				<div class="flex items-center gap-3">
					<a href="/" class="flex items-center gap-3 text-lg font-semibold">
						<div class="text-2xl">🐔</div>
						<span>Rinha de Backend 2025</span>
					</a>
					<div class="flex items-center gap-4 ml-3">
						<a
							href="/submissions"
							class="text-sm link link-hover"
							aria-label="Explorar submissões">Explorar submissões</a
						>
						<a
							href="/destaques"
							class="text-sm link link-hover"
							aria-label="Ver destaques por linguagem">Destaques</a
						>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<!-- sun -->
					<svg
						class="w-5 h-5 text-yellow-400"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						aria-hidden="true"
					>
						<circle cx="12" cy="12" r="4" fill="currentColor" />
					</svg>
					<input
						type="checkbox"
						class="toggle toggle-sm"
						bind:checked={$isNightStore}
						aria-label="Toggle theme"
					/>
					<!-- moon -->
					<svg
						class="w-5 h-5 text-slate-400"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						aria-hidden="true"
					>
						<path
							d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
							fill="currentColor"
						/>
					</svg>
				</div>
			</div>
		</div>
	</nav>

	{@render children?.()}

	<footer class="w-full bg-base-200 mt-8 py-6">
		<div class="container mx-auto px-6 text-center text-sm text-muted">
			<span
				>vibe coded with <span aria-hidden="true">❤️</span> by
				<a
					href="https://github.com/1cadumagalhaes"
					target="_blank"
					rel="noopener noreferrer"
					class="link">@1cadumagalhaes</a
				></span
			>
		</div>
	</footer>
</div>
