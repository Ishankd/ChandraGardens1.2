import { useEffect, useState } from "react";
import { HERO_SLIDES } from "@/lib/plants";

export function Hero() {
  const [idx, setIdx] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const i = setInterval(() => setIdx((p) => (p + 1) % HERO_SLIDES.length), 5500);
    return () => clearInterval(i);
  }, []);

  const go = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <section
      id="home"
      className="relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden pt-24"
    >
      {/* Slideshow */}
      {HERO_SLIDES.map((src, i) => (
        <div
          key={src}
          className={`absolute inset-0 -z-20 transition-opacity duration-[1500ms] ${
            idx === i ? "opacity-100" : "opacity-0"
          }`}
        >
          <img
            src={src}
            alt="Chandra Gardens nursery"
            className="h-full w-full object-cover"
            loading={i === 0 ? "eager" : "lazy"}
            width={1800}
            height={1000}
          />
        </div>
      ))}
      {/* Overlays */}
    <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/70 via-black/40 to-black/60" />
      <div
        className="absolute inset-0 -z-10"
        style={{ background: "var(--gradient-glow)" }}
      />

      {/* Floating leaves */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="pointer-events-none absolute text-primary-glow/40"
          style={{
            left: `${(i * 13 + 7) % 100}%`,
            top: `${(i * 17 + 10) % 80}%`,
            animation: `float-leaf ${6 + (i % 4)}s ease-in-out ${i * 0.5}s infinite`,
            fontSize: `${20 + (i % 3) * 10}px`,
          }}
          aria-hidden
        >
          <i className="fa-solid fa-leaf" />
        </div>
      ))}

      <div className="relative z-10 mx-auto max-w-5xl px-6 text-center text-white">
        <div
          className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-white backdrop-blur-xl ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-glow" />
          Madakkathara · Kerala
        </div>
        <h1
          className={`mt-6 font-display text-5xl font-medium leading-[1.05] sm:text-7xl md:text-8xl transition-all duration-1000 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          Welcome to{" "}
          <span className="italic text-primary-glow">Chandra</span>{" "}
          <span className="block">Gardens</span>
        </h1>
        <p
          className={`mx-auto mt-6 max-w-xl text-lg text-white/90 sm:text-xl transition-all duration-1000 delay-200 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          Plants Make People Happy. Premium indoor, outdoor, fruit, flowering & decorative
          plants for your home and garden.
        </p>
        <div
          className={`mt-10 flex flex-wrap items-center justify-center gap-4 transition-all duration-1000 delay-500 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <button
            onClick={() => go("products")}
            className="group inline-flex items-center gap-2 rounded-full btn-hero px-7 py-3.5 text-sm font-semibold hover:[&]:btn-hero-hover"
            style={{ transition: "all 0.3s" }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLElement).style.boxShadow =
                "var(--shadow-glow), var(--shadow-soft)";
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "";
              (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-soft)";
            }}
          >
            <i className="fa-solid fa-seedling" />
            Shop Plants
            <i className="fa-solid fa-arrow-right transition-transform group-hover:translate-x-1" />
          </button>
          <button
            onClick={() => go("contact")}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-xl transition-all hover:bg-black/40"
          >
            <i className="fa-solid fa-phone" />
            Contact Us
          </button>
        </div>

        {/* Slide dots */}
        <div className="mt-12 flex justify-center gap-2">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                idx === i ? "w-10 bg-white" : "w-3 bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={() => go("stats")}
        aria-label="Scroll"
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-white/70"
      >
        <div className="flex h-10 w-6 justify-center rounded-full border-2 border-white/60 p-1">
          <span className="block h-2 w-1 animate-bounce rounded-full bg-white" />
        </div>
      </button>
    </section>
  );
}
