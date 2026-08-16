import { CATEGORIES } from "@/lib/plants";

export function Categories({ onPick }: { onPick: (cat: string) => void }) {
  return (
    <section id="categories" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="Explore"
          title="Find your perfect plant"
          subtitle="From statement indoor greens to tropical fruit trees — every category is curated for Kerala's climate."
        />
        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c, i) => (
            <button
              key={c.name}
              onClick={() => onPick(c.name.split(" ")[0])}
              className="group relative aspect-[4/5] overflow-hidden rounded-3xl text-left"
              style={{ animation: `fade-in 0.6s ease-out ${i * 0.08}s backwards` }}
            >
              <img
                src={c.image}
                alt={c.name}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute inset-0 rounded-3xl border border-white/10 transition-colors group-hover:border-primary-glow/60" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-white">
                  <i className="fa-solid fa-leaf text-primary-glow" />
                  {c.count} varieties
                </div>
                <h3 className="font-display text-2xl font-medium text-white sm:text-3xl">
                  {c.name}
                </h3>
                <div className="mt-3 inline-flex items-center gap-2 text-sm text-white/90 transition-transform group-hover:translate-x-1">
                  Explore <i className="fa-solid fa-arrow-right" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-primary">
        <span className="h-1 w-1 rounded-full bg-primary" />
        {eyebrow}
      </div>
      <h2 className="mt-4 font-display text-4xl font-medium leading-tight sm:text-5xl md:text-6xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
          {subtitle}
        </p>
      )}
    </div>
  );
}
