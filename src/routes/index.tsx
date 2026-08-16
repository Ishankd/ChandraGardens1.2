import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Stats } from "@/components/Stats";
import { Categories } from "@/components/Categories";
import { Products } from "@/components/Products";
import { Features, CareAssistant } from "@/components/FeaturesAndCare";
import { Gallery } from "@/components/GalleryAndTestimonials";
import { About, Newsletter, Contact, Footer } from "@/components/AboutContactFooter";
import { FloatingActions } from "@/components/FloatingActions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
    { title: "Chandra Gardens | Plant Nursery in Madakkathara, Thrissur, Kerala" },
      {
        name: "description",
        content:
          "Premium indoor, outdoor, fruit, flowering & decorative plants from Madakkathara, Kerala. Healthy plants, expert advice, pan-India delivery.",
      },
      { property: "og:title", content: "Chandra Gardens — Premium Plant Nursery in Kerala" },
      {
        property: "og:description",
        content:
          "Premium indoor, outdoor, fruit & flowering plants. Madakkathara, Kerala.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { name: "twitter:card", content: "summary_large_image" },
      {
  name: "keywords",
  content:
    "Chandra Gardens, plant nursery Thrissur, nursery in Madakkathara, Kerala plants, indoor plants, outdoor plants, fruit plants, flowering plants, ornamental plants, garden plants",
},
{
  name: "robots",
  content: "index, follow",
},
    ],
    
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: "Chandra Gardens",
          image: "/Logo.png",
          telephone: "+91 9846800801",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Madakkathara",
            addressRegion: "Kerala",
            addressCountry: "IN",
          },
          sameAs: [
            "https://facebook.com/",
            "https://instagram.com/chandra.gardens",
          ],
        }),
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [filter, setFilter] = useState("All");
  const pick = (cat: string) => {
    setFilter(cat);
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <>
      <LoadingScreen />
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <Categories onPick={pick} />
        <Products filter={filter} setFilter={setFilter} />
        <Features />
        <CareAssistant />
        <Gallery />
        
        <About />
      
        <Contact />
      </main>
      <Footer />
      <FloatingActions />
    </>
  );
}
