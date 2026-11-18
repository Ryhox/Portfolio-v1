import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { links } from "@/links";

export const metadata: Metadata = {
  title: "legal",
  description: "Who runs ryhox.dev, and the credits for everything on it that isn’t mine.",
  alternates: { canonical: "/legal" },
};

const CC_BY = "https://creativecommons.org/licenses/by/4.0/";
const email = links.email.replace("mailto:", "");

// Legal notice and credits. A personal site run from Italy, with no company details to list (first section).
// When something by someone else goes on the site, its credit goes in here.
export default function Legal() {
  return (
    <LegalPage title="Legal" lead="Who runs this site, and the people whose work it’s built on." updated="November 2026">
      <section>
        <h2>Who runs this site</h2>
        <p>
          ryhox, one person, no company. It’s a personal portfolio: the things I build, and a few toys to play with on the way. Get in touch at{" "}
          <a href={links.email}>{email}</a>.
        </p>
        <p>
          It’s a personal, non-commercial website. Nothing is sold here and no paid service is offered, so it isn’t an information society
          service under Italian law (D.Lgs. 70/2003) and has no company details to list.
        </p>
      </section>

      <section id="credits">
        <h2>Credits</h2>
        <p>Made by me, standing on the work of these people:</p>
        <ul>
          <li>
            The ryPod is the 3D model{" "}
            <a href="https://sketchfab.com/3d-models/ipod-classic-13dbe30b0e45408c8bfaddfe6a4e8786" target="_blank" rel="noreferrer">
              “iPod Classic”
            </a>{" "}
            by Timothy Ahene, licensed{" "}
            <a href={CC_BY} target="_blank" rel="noreferrer">
              CC BY 4.0
            </a>
            . What I changed: smaller textures, a screen that really works instead of the pictured one, simpler glass.
          </li>
          <li>
            The songs on the ryPod are Apple Music’s 30-second previews, each linking to the full song. The music and the covers belong to the
            artists and their labels.
          </li>
          <li>The type is Bungee, Orbitron and Manrope, all under the SIL Open Font License 1.1.</li>
          <li>
            The logos in “What I do” belong to their makers and are only there to name the tools I use. Most come from Devicon (MIT licence),
            GSAP’s from Simple Icons (CC0), Lenis’s from lenis.dev.
          </li>
          <li>The two quotes are by William Blake and John Keats, long in the public domain.</li>
          <li>Everything else, the design, the code, the sky and the hill, the project videos and pictures, is my own work.</li>
        </ul>
      </section>

      <section>
        <h2>Trademarks</h2>
        <p>
          iPod and Apple Music are trademarks of Apple Inc. The ryPod is a fan-made toy modelled on the iPod Classic. This site isn’t affiliated
          with Apple or endorsed by it.
        </p>
      </section>

      <section>
        <h2>Liability</h2>
        <p>
          I keep everything here as accurate as I can, but can’t promise it’s complete or always up to date. Links to other sites were checked
          when I added them; what’s on them is up to whoever runs them. Spot something wrong or broken? <a href={links.email}>Tell me</a> and
          I’ll fix it.
        </p>
        <p>
          How your data is handled is on the <Link href="/privacy">Privacy</Link> page.
        </p>
      </section>
    </LegalPage>
  );
}
