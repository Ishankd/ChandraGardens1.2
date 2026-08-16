import { useState } from "react";
import { GALLERY, TESTIMONIALS } from "@/lib/plants";
import { SectionHeader } from "./Categories";

const GAL_CATS = ["All", "Indoor", "Outdoor", "Flowering", "Fruit", "Garden"];

export function Gallery() {
  const [cat, setCat] = useState("All");
  const [light, setLight] = useState<string | null>(null);
  const items = cat === "All" ? GALLERY : GALLERY.filter((g) => g.cat === cat);
  return (
    <section id="gallery" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader eyebrow="Gallery" title="Moments from our nursery" />
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {GAL_CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                cat === c
                  ? "bg-primary text-primary-foreground"
                  : "glass text-foreground/70 hover:bg-primary/10"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-10 columns-2 gap-4 md:columns-3 lg:columns-4">
          {items.map((g, i) => (
            <button
              key={g.src + i}
              onClick={() => setLight(g.src)}
              className={`group mb-4 block w-full overflow-hidden rounded-2xl ${
                g.h === "tall" ? "row-span-2" : ""
              }`}
              style={{ breakInside: "avoid" }}
            >
              <img
                src={g.src}
                alt={`Chandra Gardens ${g.cat}`}
                loading="lazy"
                className={`w-full ${g.h === "tall" ? "h-80" : "h-56"} object-cover transition-transform duration-700 group-hover:scale-110`}
              />
            </button>
          ))}
        </div>
      </div>

      {light && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-4 animate-[fade-in_0.2s]"
          onClick={() => setLight(null)}
        >
          <img src={light} alt="" className="max-h-[90vh] max-w-full rounded-2xl" />
          <button
            onClick={() => setLight(null)}
            aria-label="Close"
            className="absolute right-6 top-6 grid h-10 w-10 place-items-center rounded-full glass text-white"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}
    </section>
  );
}

export function Testimonials() {
  return (
    <section className="relative overflow-hidden py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader eyebrow="Reviews" title="Loved by gardeners" />
      </div>
      <div className="relative mt-12">
        <div className="flex animate-[scroll-x_40s_linear_infinite] gap-6 px-6">
          {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
            <article
              key={i}
              className="w-[340px] flex-shrink-0 rounded-3xl glass p-6 transition hover:-translate-y-1"
            >
              <div className="flex gap-1 text-amber-500">
                {[...Array(t.rating)].map((_, j) => (
                  <i key={j} className="fa-solid fa-star text-sm" />
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed">"{t.text}"</p>
              <div className="mt-5 flex items-center gap-3">
                <img src={t.avatar} alt={t.name} className="h-11 w-11 rounded-full object-cover" />
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">Verified customer</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
      <style>{`@keyframes scroll-x { to { transform: translateX(-50%); } }`}</style>
    </section>
  );
}
