import { useState } from "react";
import { SectionHeader } from "./Categories";
import { PHONE, PHONE1, WHATSAPP } from "@/lib/site";
import logo from "@/assets/Logo.png";

const TIMELINE = [
  { year: "2019", title: "Roots planted", desc: "Chandra Gardens opens with 50 plant varieties in Madakkathara." },
  { year: "2020", title: "Going retail", desc: "Doors open to home gardeners across central Kerala." },
  { year: "2026", title: "Fruit specialty", desc: "Expansion into rare tropical fruit trees — Mangosteen, Jaboticaba." },
 
];

export function About() {
  return (
    <section id="about" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-primary">
              Our Story
            </div>
            <h2 className="mt-4 font-display text-4xl font-medium leading-tight sm:text-5xl">
              A decade of growing,{" "}
              <span className="italic gradient-text">together</span>
            </h2>
            <p className="mt-5 text-muted-foreground">
              From a humble plot in Madakkathara to one of Kerala's most loved nurseries,
              Chandra Gardens is built on a single belief — plants make people happy.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              <Mission icon="fa-bullseye" title="Mission">
                Grow healthy plants. Share honest advice. Build greener homes.
              </Mission>
              <Mission icon="fa-eye" title="Vision">
                A plant in every home. A garden in every neighbourhood.
              </Mission>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-[40px] bg-gradient-to-br from-primary/20 to-primary-glow/20 blur-2xl" />
            <img
              src="https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=900&q=80"
              alt="Chandra Gardens nursery"
              loading="lazy"
              className="aspect-[4/5] w-full rounded-[32px] object-cover shadow-[var(--shadow-soft)]"
            />
            <div className="absolute -bottom-6 -left-6 flex items-center gap-3 rounded-2xl glass p-4 shadow-lg">
              <img src={logo} alt="" className="h-10 w-10" />
              <div>
                <div className="font-display text-lg">6+ Years</div>
                <div className="text-xs text-muted-foreground">Of growing trust</div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="mt-20">
          <div className="relative">
            <div className="absolute left-4 top-0 h-full w-0.5 bg-gradient-to-b from-primary via-primary-glow to-transparent md:left-1/2" />
            <div className="space-y-8">
              {TIMELINE.map((t, i) => (
                <div
                  key={t.year}
                  className={`relative grid items-center gap-4 md:grid-cols-2 ${
                    i % 2 ? "md:[&>div:first-child]:order-2" : ""
                  }`}
                >
                  <div className={`pl-12 md:pl-0 ${i % 2 ? "md:text-left md:pl-10" : "md:text-right md:pr-10"}`}>
                    <div className="font-display text-3xl text-primary">{t.year}</div>
                    <div className="mt-1 font-display text-xl font-medium">{t.title}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
                  </div>
                  <div className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground md:left-1/2 md:-translate-x-1/2">
                    <i className="fa-solid fa-leaf text-[10px]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Mission({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
        <i className={`fa-solid ${icon}`} />
      </div>
      <div className="mt-2 font-display text-lg">{title}</div>
      <p className="mt-1 text-xs text-muted-foreground">{children}</p>
    </div>
  );
}

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<null | "ok" | "err">(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setStatus("err");
    setStatus("ok");
    setEmail("");
    setTimeout(() => setStatus(null), 3000);
  };
  /*return (
    <section className="relative py-20">
   <div className="mx-auto max-w-4xl overflow-hidden rounded-[40px] bg-gradient-to-br from-primary via-primary to-[oklch(0.35_0.12_150)] px-6 py-14 text-center text-primary-foreground shadow-[var(--shadow-soft)]">
        <i className="fa-solid fa-envelope-open-text text-3xl text-primary-glow" />
        <h3 className="mt-4 font-display text-3xl font-medium sm:text-4xl">
          Get plant care tips in your inbox
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm opacity-80">
          Seasonal advice, new arrivals and member-only offers — once a month.
        </p>
        
        <form
          onSubmit={submit}
          className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            aria-label="Email"
            required
            className="flex-1 rounded-full bg-white/15 px-5 py-3 text-sm text-white placeholder-white/60 outline-none ring-white/30 focus:ring-2"
          />
          <button
            type="submit"
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary hover:bg-primary-glow hover:text-white transition"
          >
            Subscribe
          </button>
        </form>
        {status === "ok" && (
          <div className="mt-3 text-sm animate-[fade-in_0.3s]">✓ Subscribed! Welcome to the garden.</div>
        )}
        {status === "err" && (
          <div className="mt-3 text-sm text-rose-200">Please enter a valid email.</div>
        )}
      </div>
    </section>
  );*/
}

export function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);
const submit = async (e: React.FormEvent) => {
  e.preventDefault();

  const response = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      access_key: "02d50d16-337c-4a70-bc08-f627e01eda4f",
      name: form.name,
      email: form.email,
      phone: form.phone,
      subject: form.subject,
      message: form.message,
    }),
  });

  const result = await response.json();

  if (result.success) {
    setSent(true);

    setForm({
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    });

    setTimeout(() => setSent(false), 4000);
  } else {
    alert("Failed to send message");
  }
};
  const u = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });
const LOCATIONS = [
  {
    name: "Madakkathara Nursery",
    address: "Madakkathara, Thrissur, Kerala",
    map: "https://maps.app.goo.gl/zxUG998GJnMHNAjS6",
  },
  {
    name: "Karuvankadu Nursery",
    address: "Karuvankadu, Thrissur, Kerala",
    map: "https://maps.app.goo.gl/QkHWdf7xjGWgbio87",
  },
  {
    name: "Dubai Road Nursery",
    address: "Dubai Road, Thrissur, Kerala",
    map: "https://maps.app.goo.gl/GR3oGuGxpsrUtYJH6",
  },
  {
    name: "Agasthya Nagar Nursery",
    address: "Agasthya Nagar, Thrissur, Kerala",
    map: "https://maps.app.goo.gl/eyFr9RS9iDRAAtvu7",
  },
];
  return (
    <section id="contact" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="Visit Us"
          title="Let's grow together"
          subtitle="Drop by, call, or send us a message — we love talking plants."
        />
        <div className="mt-12 grid items-start gap-6 lg:grid-cols-5">
    <div className="space-y-4 lg:col-span-2">
  <div className="rounded-[32px] glass p-8">
  <h4 className="font-display text-2xl">Our Locations</h4>

  <p className="mt-2 text-sm text-muted-foreground">
    Visit any of our branches across Thrissur for premium plants,
    fruit trees and expert gardening advice.
  </p>

  <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
    {LOCATIONS.map((location) => (
      <div
        key={location.name}
        className="group rounded-3xl border border-primary/10 bg-gradient-to-br from-background/80 to-primary/5 p-6 min-h-[180px] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl"
      >
        <div className="flex gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <i className="fa-solid fa-location-dot text-lg" />
          </div>

          <div className="flex-1">
            <span className="mb-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
              Nursery
            </span>

            <h5 className="font-display text-lg font-semibold">
              {location.name}
            </h5>

            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {location.address}
            </p>

            <div className="mt-3 flex items-center gap-2 text-sm">
              <i className="fa-solid fa-phone text-primary" />
              {PHONE}
            </div>

            <a
              href={location.map}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white"
            >
              <i className="fa-solid fa-map-location-dot" />
              View Map
            </a>
          </div>
        </div>
      </div>
    ))}
  </div>



  <div className="mt-8 flex gap-3">
    <a
      href={`tel:${PHONE.replace(/\s/g, "")}`}
      className="flex-1 rounded-full btn-hero py-3 text-center text-sm font-semibold"
    >
      <i className="fa-solid fa-phone mr-2" />
      Call Now
    </a>

    <a
      href={WHATSAPP}
      target="_blank"
      rel="noreferrer"
      className="flex-1 rounded-full bg-[#25D366] py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
    >
      <i className="fa-brands fa-whatsapp mr-2" />
      WhatsApp
    </a>
  </div>

 
    
    <div className="mt-5 flex gap-3">
      <a
        href="https://www.facebook.com/profile.php?id=100090427692369"
        target="_blank"
        rel="noreferrer"
        aria-label="Facebook"
        className="grid h-10 w-10 place-items-center rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground transition"
      >
        <i className="fa-brands fa-facebook-f" />
      </a>

      <a
        href="https://instagram.com/chandra.gardens"
        target="_blank"
        rel="noreferrer"
        aria-label="Instagram"
        className="grid h-10 w-10 place-items-center rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground transition"
      >
        <i className="fa-brands fa-instagram" />
      </a>
    </div>
  </div>

 </div>

       <form
  onSubmit={submit}
  className="rounded-3xl glass p-8 lg:col-span-3 flex flex-col min-h-[700px]"
>
  <h4 className="font-display text-2xl">Send a message</h4>

  <div className="mt-6 grid gap-4 sm:grid-cols-2">
    <Input placeholder="Your Name" value={form.name} onChange={u("name")} required />
    <Input type="email" placeholder="Email Address" value={form.email} onChange={u("email")} required />
    <Input type="tel" placeholder="Phone Number" value={form.phone} onChange={u("phone")} />
    <Input placeholder="Subject" value={form.subject} onChange={u("subject")} required />
  </div>

  <textarea
    required
    placeholder="Tell us about the plants you're looking for..."
    value={form.message}
    onChange={u("message")}
    className="mt-4 flex-1 w-full rounded-3xl border border-border bg-background/60 px-5 py-4 text-sm outline-none focus:border-primary resize-none"
  />

  <button
    type="submit"
    className="mt-5 w-full rounded-full btn-hero py-4 text-sm font-semibold"
  >
    <i className="fa-solid fa-paper-plane mr-2" />
    Send Message
  </button>

  {sent && (
    <div className="mt-4 rounded-2xl bg-primary/10 p-3 text-sm text-primary">
      ✓ Thank you! We'll get back to you within a day.
    </div>
  )}
</form>
        </div>
      </div>
    </section>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="rounded-full border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary"
    />
  );
}
function Row({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
        <i className={`fa-solid ${icon}`} />
      </span>
      <span>{children}</span>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="relative mt-10 overflow-hidden border-t border-border bg-gradient-to-b from-background to-primary/5 pt-16 pb-8">
      <div className="pointer-events-none absolute -left-20 top-10 text-9xl text-primary/5">
        <i className="fa-solid fa-leaf" />
      </div>
      <div className="pointer-events-none absolute -right-10 bottom-10 text-9xl text-primary/5 rotate-45">
        <i className="fa-solid fa-seedling" />
      </div>
      <div className="mx-auto grid max-w-7xl gap-10 px-6 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2">
            <img src={logo} alt="" className="h-10 w-10" />
            <span className="font-display text-xl">Chandra Gardens</span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Premium plant nursery in Madakkathara, Kerala. Crafted with care since 2019.
          </p>
        </div>
        <FCol title="Quick Links" items={["Home", "Categories", "Products", "Gallery", "About Us", "Contact"]} />
        <FCol title="Categories" items={["Decorative", "Office", "Fruit", "Indoor", "Outdoor", "Flowering"]} />
        <div>
          <h5 className="font-display text-lg">Stay in touch</h5>
          <p className="mt-3 text-sm text-muted-foreground">{PHONE}</p>
          <p className="mt-3 text-sm text-muted-foreground">{PHONE1}</p>
          
          <p className="text-sm text-muted-foreground">Madakkathara, Kerala</p>
         
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-7xl border-t border-border px-6 pt-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Chandra Gardens. All Rights Reserved. · IshanKD
      </div>
    </footer>
  );
}
function FCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h5 className="font-display text-lg">{title}</h5>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map((i) => (
          <li key={i}>
            <a href={`#${i.toLowerCase().replace(/\s/g, "")}`} className="text-muted-foreground hover:text-primary transition">
              {i}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
