import { useEffect, useState } from "react";

const KEY_THEME = "cg-theme";
const KEY_WISH = "cg-wishlist";
const KEY_RECENT = "cg-recent";

export function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem(KEY_THEME);
   const isDark = saved ? saved === "dark" : false;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);
  const toggle = () => {
    setDark((d) => {
      const next = !d;
      localStorage.setItem(KEY_THEME, next ? "dark" : "light");
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  };
  return { dark, toggle };
}

export function useLocalList(key: string) {
  const storageKey = key === "wishlist" ? KEY_WISH : KEY_RECENT;
  const [items, setItems] = useState<string[]>([]);
  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem(storageKey) || "[]"));
    } catch {}
  }, [storageKey]);
  const save = (next: string[]) => {
    setItems(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };
  const toggle = (id: string) =>
    save(items.includes(id) ? items.filter((i) => i !== id) : [...items, id]);
  const add = (id: string) => {
    if (items.includes(id)) {
      save([id, ...items.filter((i) => i !== id)]);
    } else {
      save([id, ...items].slice(0, 8));
    }
  };
  return { items, toggle, add, has: (id: string) => items.includes(id) };
}

export function useCounter(target: number, trigger: boolean, duration = 1800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    const start = performance.now();
    let raf: number;
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, trigger, duration]);
  return value;
}

export function useInView<T extends Element>(opts?: IntersectionObserverInit) {
  const [ref, setRef] = useState<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref) return;
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setInView(true),
      { threshold: 0.3, ...opts },
    );
    obs.observe(ref);
    return () => obs.disconnect();
  }, [ref, opts]);
  return { setRef, inView };
}

export function useScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const total = h.scrollHeight - h.clientHeight;
      setP(total > 0 ? (h.scrollTop / total) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return p;
}

export const WHATSAPP = "https://wa.me/918921488503";
export const PHONE = "+91 9846800801";
export const PHONE1 = "+91 8921488503";
