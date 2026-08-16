import { useCounter, useInView } from "@/lib/site";

const STATS = [
  { value: 10, suffix: "L+", label: "Plants Sold", icon: "fa-leaf" },
  { value: 50000, suffix: "+", label: "Happy Customers", icon: "fa-face-smile" },
  { value: 200, suffix: "+", label: "Plant Varieties", icon: "fa-tree" },
  { value: 6, suffix: "+", label: "Years Experience", icon: "fa-award" },
];

function StatCard({ stat, trigger }: { stat: typeof STATS[number]; trigger: boolean }) {
  const v = useCounter(stat.value, trigger);
  return (
    <div className="group relative overflow-hidden rounded-3xl glass p-6 text-center transition-transform hover:-translate-y-2">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <i className={`fa-solid ${stat.icon} text-xl`} />
      </div>
      <div className="font-display text-4xl font-semibold gradient-text sm:text-5xl">
        {v.toLocaleString()}
        {stat.suffix}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
    </div>
  );
}

export function Stats() {
  const { setRef, inView } = useInView<HTMLElement>();
  return (
    <section id="stats" ref={setRef} className="relative py-20">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-6 md:grid-cols-4 md:gap-6">
        {STATS.map((s) => (
          <StatCard key={s.label} stat={s} trigger={inView} />
        ))}
      </div>
    </section>
  );
}
