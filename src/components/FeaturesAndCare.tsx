import { useState } from "react";
import { SectionHeader } from "./Categories";

const FEATURES = [
  { icon: "fa-leaf", title: "Healthy Plants", desc: "Hand-inspected, disease-free, ready to thrive." },
  { icon: "fa-user-graduate", title: "Expert Advice", desc: "Decade of horticulture knowledge at your service." },
  { icon: "fa-shield-halved", title: "Secure Payments", desc: "Trusted UPI and net-banking options." },
 /* { icon: "fa-truck-fast", title: "Fast Delivery", desc: "Carefully packed and shipped across India." },*/
  { icon: "fa-warehouse", title: "Wholesale Orders", desc: "Bulk supply for landscapers and resellers." },
  { icon: "fa-headset", title: "24/7 Support", desc: "Quick replies on WhatsApp, any time." },
];

const SEASONAL = [
  { name: "Hibiscus", badge: "Monsoon", tip: "Loves humidity & morning sun." },
  { name: "Adenium", badge: "Summer", tip: "Drought tolerant desert rose." },
  { name: "Rambutan", badge: "Tropical", tip: "Perfect time to plant in Kerala." },
];

export function Features() {
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader eyebrow="Why Chandra Gardens" title="Built on care" />
        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-3xl glass p-6 transition-all hover:-translate-y-1"
              style={{ animation: `fade-in 0.5s ease-out ${i * 0.06}s backwards` }}
            >
              <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground transition-transform group-hover:scale-110 group-hover:rotate-3">
                <i className={`fa-solid ${f.icon} text-xl`} />
              </div>
              <h3 className="font-display text-xl font-medium">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Seasonal */}
        <div className="mt-16 rounded-3xl bg-gradient-to-br from-primary/10 via-primary-glow/10 to-transparent p-6 md:p-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-primary">In Season</div>
              <h3 className="mt-2 font-display text-3xl font-medium md:text-4xl">
                Recommended this season
              </h3>
            </div>
            <span className="text-sm text-muted-foreground">Curated by our experts</span>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {SEASONAL.map((s) => (
              <div key={s.name} className="rounded-2xl bg-card p-5 shadow-sm">
                <div className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                  <i className="fa-solid fa-sun" /> {s.badge}
                </div>
                <h4 className="mt-2 font-display text-xl font-medium">{s.name}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{s.tip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function CareAssistant() {
  const [plant, setPlant] = useState("Indoor Plant");
  const [sun, setSun] = useState("Partial Sun");
  const [water, setWater] = useState("Alternate Days");
  const [result, setResult] = useState<null | { tips: string[]; schedule: string; fert: string; growth: string }>(null);

  const generate = () => {
    const tips = [
      `Place your ${plant.toLowerCase()} where it receives ${sun.toLowerCase()}.`,
      `Use well-draining soil mixed with coco peat and compost.`,
      `Mist leaves to maintain humidity, especially in dry months.`,
      `Wipe leaves weekly for healthy photosynthesis.`,
    ];
    const schedule =
      water === "Daily"
        ? "Water lightly every morning, ensuring no waterlogging."
        : water === "Alternate Days"
        ? "Deep water every 2 days, allow topsoil to dry between."
        : "One thorough soak per week is ideal.";
    const fert = "Organic compost monthly + diluted seaweed liquid every 2 weeks during growing season.";
    const growth = "Repot every 12-18 months. Prune dead leaves and rotate the pot for even growth.";
    setResult({ tips, schedule, fert, growth });
  };

  return (
    <section id="care" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="Smart Care"
          title="Plant Care Assistant"
          subtitle="Tell us about your plant and get a personalised care plan."
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl glass p-6 md:p-8">
            <Field label="Plant Type">
              <input
                value={plant}
                onChange={(e) => setPlant(e.target.value)}
                className="w-full rounded-full border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </Field>
            <Field label="Sunlight">
              <Pills options={["Full Sun", "Partial Sun", "Shade"]} value={sun} onChange={setSun} />
            </Field>
            <Field label="Watering Frequency">
              <Pills options={["Daily", "Alternate Days", "Weekly"]} value={water} onChange={setWater} />
            </Field>
            <button
              onClick={generate}
              className="mt-2 w-full rounded-full btn-hero py-3.5 text-sm font-semibold"
            >
              <i className="fa-solid fa-wand-magic-sparkles mr-2" /> Generate Care Plan
            </button>
          </div>

          <div className="rounded-3xl glass p-6 md:p-8">
            {!result ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                <i className="fa-solid fa-seedling mb-3 text-5xl text-primary/40" />
                <p>Your personalised plan will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4 animate-[fade-in_0.4s_ease-out]">
                <ResultCard icon="fa-lightbulb" title="Care Tips">
                  <ul className="space-y-2 text-sm">
                    {result.tips.map((t) => (
                      <li key={t} className="flex gap-2">
                        <i className="fa-solid fa-leaf mt-1 text-primary" /> {t}
                      </li>
                    ))}
                  </ul>
                </ResultCard>
                <ResultCard icon="fa-droplet" title="Water Schedule">
                  <p className="text-sm">{result.schedule}</p>
                </ResultCard>
                <ResultCard icon="fa-flask" title="Fertilizer">
                  <p className="text-sm">{result.fert}</p>
                </ResultCard>
                <ResultCard icon="fa-arrow-up" title="Growth Advice">
                  <p className="text-sm">{result.growth}</p>
                </ResultCard>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
function Pills({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
            value === o
              ? "bg-primary text-primary-foreground"
              : "bg-background/60 text-foreground/70 hover:bg-primary/10"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
function ResultCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-background/60 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary">
          <i className={`fa-solid ${icon} text-xs`} />
        </span>
        {title}
      </div>
      {children}
    </div>
  );
}
