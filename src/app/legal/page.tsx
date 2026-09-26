import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { links } from "@/links";

export const metadata: Metadata = {
  title: "Legal",
  description: "Who runs ryhox.dev, and the credits for everything on it that isn't mine.",
  alternates: { canonical: "/legal" },
};

const CC_BY = "https://creativecommons.org/licenses/by/4.0/";
const email = links.email.replace("mailto:", "");

// Legal notice and credits. A personal site run from Italy: no company details to list (see the first section).
export default function Legal() {
  return (
    <LegalPage title="Legal" lead="Who runs this site, and the credits for everything on it that isn’t mine." updated="September 2026">
      <section>
        <h2>Who runs this site</h2>
        <p>
          ryhox, a personal portfolio. Contact: <a href={links.email}>{email}</a>
        </p>
        <p>
          This is a personal, non-commercial website: it doesn’t sell anything or provide paid services online, so it isn’t an information
          society service under Italian law (D.Lgs. 70/2003) and has no company details to list.
        </p>
      </section>

      <section id="credits">
        <h2>Credits &amp; licences</h2>
        <ul>
          <li>
            3D model{" "}
            <a href="https://sketchfab.com/3d-models/ipod-classic-13dbe30b0e45408c8bfaddfe6a4e8786" target="_blank" rel="noreferrer">
              “iPod Classic”
            </a>{" "}
            by Timothy Ahene,{" "}
            <a href={CC_BY} target="_blank" rel="noreferrer">
              CC BY 4.0
            </a>
            . Changed: textures compressed, the pictured screen replaced by a working one, the glass simplified.
          </li>
          <li>
            3D model{" "}
            <a href="https://sketchfab.com/3d-models/chonky-cat-trio-d9a2d94179384803af7456d633283496" target="_blank" rel="noreferrer">
              “Chonky Cat Trio”
            </a>{" "}
            by Kanna-Nakajima,{" "}
            <a href={CC_BY} target="_blank" rel="noreferrer">
              CC BY 4.0
            </a>
            . Changed: one cat of the three, animated.
          </li>
          <li>Songs on the ryPod: 30-second previews from Apple Music, each linking to the full song. Music and covers belong to the artists and their labels.</li>
          <li>Fonts: Bungee, Orbitron, Fredoka and Manrope, SIL Open Font License 1.1.</li>
          <li>Everything else (design, code, project videos and pictures) is my own work.</li>
        </ul>
      </section>

      <section>
        <h2>Trademarks</h2>
        <p>
          iPod and Apple Music are trademarks of Apple Inc. The ryPod is a fan-made toy modelled on the iPod Classic; this site is not affiliated
          with or endorsed by Apple.
        </p>
      </section>

      <section>
        <h2>Liability</h2>
        <p>
          I keep this site accurate as best I can, but can’t promise it’s complete or up to date. Links to other sites are checked when added;
          what’s on them is up to whoever runs them.
        </p>
      </section>
    </LegalPage>
  );
}
