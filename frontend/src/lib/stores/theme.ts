import { writable } from "svelte/store";

// true = night, false = pastel
export const isNightStore = writable(false);
