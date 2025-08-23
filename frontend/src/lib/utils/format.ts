export function languageSlug(l: string) {
  if (!l) return "";
  return l.toLowerCase().replace(/\+/g, "plus").replace(/#/g, "sharp");
}

export function rankBorderColor(rank: number | undefined) {
  if (!rank) return null;
  if (rank === 1) return "#f59e0b";
  if (rank === 2) return "#9ca3af";
  return "#b87333";
}

export function compactNumber(n: number) {
  if (n == null || Number.isNaN(n)) return "-";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return Math.round(n / 1_000_000) + "M";
  if (abs >= 1_000) return Math.round(n / 1_000) + "K";
  return String(Math.round(n));
}


export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

