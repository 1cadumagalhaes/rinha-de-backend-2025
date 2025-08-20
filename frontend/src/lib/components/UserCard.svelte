<script lang="ts">
  import { onMount } from "svelte";
  export let username: string | undefined = undefined;
  export let repoUrl: string | undefined = undefined;
  export let name: string | undefined = undefined;
  export let avatarUrl: string | undefined = undefined;
  export let socials: string[] = [];

  let ghAvatar = avatarUrl;

  onMount(async () => {
    // prefer username from repoUrl if provided
    if (!username && repoUrl) {
      try {
        const m = repoUrl.match(/github.com\/(?:.*\/)??([^/]+)(?:\/|$)/i);
        if (m) username = m[1];
      } catch (e) {}
    }

    if (!ghAvatar && username) {
      try {
        const res = await fetch(`https://api.github.com/users/${username}`);
        if (res.ok) {
          const j = await res.json();
          ghAvatar = j.avatar_url;
        }
      } catch (e) {
        // ignore
      }
    }
  });

  function socialKind(url: string) {
    if (!url) return "link";
    if (url.includes("github.com")) return "github";
    if (url.includes("twitter.com")) return "twitter";
    if (url.includes("linkedin.com")) return "linkedin";
    if (url.includes("instagram.com")) return "instagram";
    return "link";
  }
</script>

<div class="flex items-center gap-4">
  <div
    class="w-16 h-16 rounded-full bg-base-300 overflow-hidden flex items-center justify-center"
  >
    {#if ghAvatar}
      <img src={ghAvatar} alt={username} class="w-full h-full object-cover" />
    {:else}
      <div class="text-xl">{(name || username || "?")[0]}</div>
    {/if}
  </div>
  <div>
    <div class="font-semibold">{name || username}</div>
    <div class="text-sm text-muted">{username ? `@${username}` : ""}</div>
    <div class="mt-2 flex items-center gap-3 text-base">
      {#each socials as s}
        <a class="link link-hover" href={s} target="_blank" rel="noopener">
          {#if socialKind(s) === "github"}
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"
              ><path
                d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.92.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.36-1.3-1.72-1.3-1.72-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.78 2.73 1.27 3.4.97.11-.76.41-1.27.74-1.56-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.45.11-3.02 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.64 1.57.24 2.73.12 3.02.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.4-5.25 5.68.42.36.79 1.08.79 2.18 0 1.57-.01 2.83-.01 3.22 0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z"
              /></svg
            >
          {:else if socialKind(s) === "twitter" || s.includes("x.com")}
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"
              ><path
                d="M23 3a10.9 10.9 0 0 1-3.14 1.53A4.48 4.48 0 0 0 22.43 1s-2 .5-3.46 1.6A4.48 4.48 0 0 0 12 6.1v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"
              /></svg
            >
          {:else if socialKind(s) === "linkedin"}
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"
              ><path
                d="M4.98 3.5C3.88 3.5 3 4.37 3 5.47c0 1.08.88 1.95 1.98 1.95 1.1 0 1.98-.87 1.98-1.95C6.96 4.37 6.08 3.5 4.98 3.5zM3 8.98h4v12H3zM9 8.98h3.8v1.63h.05c.53-1 1.82-2.05 3.75-2.05 4 0 4.75 2.62 4.75 6.03v6.39h-4v-5.66c0-1.35-.02-3.09-1.88-3.09-1.88 0-2.17 1.46-2.17 2.99v5.76h-4z"
              /></svg
            >
          {:else}
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"
              ><path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
              /></svg
            >
          {/if}
        </a>
      {/each}
    </div>
  </div>
</div>
