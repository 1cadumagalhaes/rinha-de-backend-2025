import * as icons from "simple-icons";
import { languageSlug } from "./format";

export function getIconSvg(name: string, size: string = "w-6 h-6") {
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
    return `<svg class=\"${size}\" role=\"img\" aria-label=\"${label}\" viewBox=\"0 0 24 24\" fill=\"currentColor\" style=\"color:#${ico.hex}\"><title>${label}</title><path d=\"${ico.path}\"/></svg>`;
  }

  const slugMap: Record<string, string> = {
    java: "/icons/java.svg",
    csharp: "/icons/csharp.svg",
    assembly: "/icons/assembly.png",
  };

  const img = slugMap[slug];
  if (img) {
    const label = esc(String(name));
    return `<img src=\"${img}\" alt=\"${label}\" class=\"${size} object-contain\"/>`;
  }

  return null;
}

export function findIconFor(slug: string) {
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