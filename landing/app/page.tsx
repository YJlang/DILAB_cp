import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Problem } from "@/components/Problem";
import { WhatWeDo } from "@/components/WhatWeDo";
import { WhatChanges } from "@/components/WhatChanges";
import { Evidence } from "@/components/Evidence";
import { About } from "@/components/About";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Problem />
        <WhatWeDo />
        <WhatChanges />
        <Evidence />
        <About />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
