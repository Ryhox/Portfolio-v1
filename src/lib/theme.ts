export type Theme = "light" | "dark";

const KEY = "ryhox-theme";
// The top of the sky, by day and by night: the browser bar blends into it.
const BAR = { light: "#2f7fe2", dark: "#050b1f" };

// Shared with the WebGL layers: 0 by day, 1 at night, eased over about a second (Backdrop drives it).
export const theme = { night: 0 };

// The theme lives on <html data-theme> (set before the first paint by the script in layout.tsx).
export function currentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

// The tab's icon follows the theme too: the hill by day, by moonlight at night (public/icons). Kept in step by
// THEME_SCRIPT below, which also catches the icon link Next adds to the head after the page has loaded.
const ICON = { light: "/icons/day.svg", dark: "/icons/night.svg" };

function apply(t: Theme) {
  document.documentElement.dataset.theme = t;
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => (m.content = BAR[t]));
  window.dispatchEvent(new CustomEvent("themechange", { detail: t }));
}

// The switch in the nav: the visitor's pick, for the rest of this visit (next time, the device decides again).
export function setTheme(t: Theme) {
  try {
    sessionStorage.setItem(KEY, t);
  } catch {
    // Storage can be blocked; the switch still works for this page.
  }
  apply(t);
}

// The device's own setting (light / dark appearance). If it reports none, the time of day decides: day from
// 7 to 19, night otherwise.
export function systemTheme(): Theme {
  const is = (q: string) => window.matchMedia(`(prefers-color-scheme: ${q})`).matches;
  if (is("dark")) return "dark";
  if (is("light")) return "light";
  const h = new Date().getHours();
  return h >= 7 && h < 19 ? "light" : "dark";
}

// Follow the device when its appearance changes (e.g. auto dark mode at sunset), unless the visitor picked one.
export function followSystem() {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    let picked: string | null = null;
    try {
      picked = sessionStorage.getItem(KEY);
    } catch {}
    if (picked !== "light" && picked !== "dark") apply(systemTheme());
  };
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

// Runs before the first paint (layout.tsx): the pick from this visit, else the device's setting, else the time
// of day. (A pick used to be kept forever, which then overrode the device; that old one is cleared.) Then it
// keeps the tab's icon on the theme's: on every icon link in the head, including ones added or reset later.
export const THEME_SCRIPT = `(function(){try{localStorage.removeItem("${KEY}");var t=null;try{t=sessionStorage.getItem("${KEY}")}catch(e){}if(t!=="light"&&t!=="dark"){var m=function(q){return matchMedia("(prefers-color-scheme: "+q+")").matches},h=new Date().getHours();t=m("dark")?"dark":m("light")?"light":h>=7&&h<19?"light":"dark"}document.documentElement.setAttribute("data-theme",t);var I={light:"${ICON.light}",dark:"${ICON.dark}"},d=document.documentElement,f=function(){var h=I[d.getAttribute("data-theme")==="dark"?"dark":"light"];document.querySelectorAll('link[rel~="icon"][type="image/svg+xml"]').forEach(function(l){if(l.getAttribute("href")!==h)l.setAttribute("href",h)})};f();new MutationObserver(f).observe(document.head,{childList:true,subtree:true,attributes:true,attributeFilter:["href"]});new MutationObserver(f).observe(d,{attributes:true,attributeFilter:["data-theme"]})}catch(e){}})()`;
