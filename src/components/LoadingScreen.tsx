import { useEffect, useState } from "react";
import logo from "@/assets/Logo.png";

export function LoadingScreen() {
  const [gone, setGone] = useState(false);
  const [fade, setFade] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setFade(true), 1400);
    const t2 = setTimeout(() => setGone(true), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  if (gone) return null;
  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        fade ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden={fade}
    >
      <div className="relative h-32 w-32 animate-grow">
        <img src={logo} alt="Chandra Gardens" className="h-full w-full object-contain" />
      </div>
      <div className="mt-6 overflow-hidden">
        <h1 className="font-display text-2xl tracking-wide gradient-text animate-grow">
          Chandra Gardens
        </h1>
      </div>
      <div className="mt-4 h-1 w-48 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-full animate-shimmer bg-primary/40" />
      </div>
    </div>
  );
}
