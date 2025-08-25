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
  if (abs >= 1_000_000) {
    const val = n / 1_000_000;
    return (val < 100 && val % 1 !== 0 ? val.toFixed(2) : Math.round(val)) + "M";
  }
  if (abs >= 1_000) {
    const val = n / 1_000;
    return (val < 100 && val % 1 !== 0 ? val.toFixed(2) : Math.round(val)) + "K";
  }
  return String(Math.round(n));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

