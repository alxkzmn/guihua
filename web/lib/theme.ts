export type ThemePreference = "system" | "light" | "dark";

const THEME_KEY = "kaoshi_theme_v1";

export function getStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const t = window.localStorage.getItem(THEME_KEY);
    if (t === "light" || t === "dark" || t === "system") return t;
  } catch {}
  return "system";
}

export function setStoredTheme(pref: ThemePreference) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_KEY, pref);
}

export function applyTheme(pref: ThemePreference) {
  if (typeof document === "undefined") return;
  if (pref === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", pref);
  }
}

export const inlineThemeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('${THEME_KEY}');
    if (t === 'light' || t === 'dark') {
      document.documentElement.setAttribute('data-theme', t);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  } catch (e) {}
})();
`;


