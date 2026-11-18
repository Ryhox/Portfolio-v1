import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { links } from "@/links";

export const metadata: Metadata = {
  title: "privacy",
  description: "What ryhox.dev does with your data: almost nothing. No cookies, no tracking, no analytics.",
  alternates: { canonical: "/privacy" },
};

const email = links.email.replace("mailto:", "");

// Privacy policy (GDPR). Keep it true to what the site does: if something new is stored or loaded from
// somewhere else, it goes in here.
export default function Privacy() {
  return (
    <LegalPage
      title="Privacy"
      lead="No cookies, no tracking, no analytics, no ads. This page lists the little that does happen, and why."
      updated="November 2026"
    >
      <section>
        <h2>Who’s responsible</h2>
        <p>
          ryhox, one person, no company (more on the <Link href="/legal">Legal</Link> page). Anything about your data, write to{" "}
          <a href={links.email}>{email}</a> and you’ll get an answer from a person.
        </p>
      </section>

      <section>
        <h2>When you open the site</h2>
        <p>
          The site is hosted by Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, USA. To send you the pages and keep them safe from
          abuse, Vercel’s servers note a few technical details of each request: your IP address, the time, the page asked for, and your
          browser and system. These logs are kept only briefly and aren’t used to build a profile of you.
        </p>
        <p>
          Legal basis: legitimate interest in running a secure website, Art. 6 (1)(f) GDPR. Vercel is certified under the EU-U.S. Data
          Privacy Framework, so data that reaches its servers in the USA is covered by the EU’s adequacy decision (Art. 45 GDPR). More in{" "}
          <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer">
            Vercel’s privacy policy
          </a>
          .
        </p>
        <p>The fonts come from this site itself. Nothing is loaded from Google or any other font service.</p>
      </section>

      <section>
        <h2>Kept in your browser</h2>
        <p>No cookies at all. Just a few small notes your browser keeps for this site, which never leave your device:</p>
        <ul>
          <li>
            <code>ryhox-theme</code>: day or night, if you flipped the switch. Gone as soon as you close the tab.
          </li>
          <li>
            <code>ipod-music-ok</code>: that you allowed the song previews from Apple, so the ryPod doesn’t ask every time.
          </li>
          <li>
            <code>ipod-best-</code> plus the game’s name: your best score in each ryPod game.
          </li>
        </ul>
        <p>Clearing this site’s data in your browser settings removes all of them.</p>
      </section>

      <section>
        <h2>Music on the ryPod (Apple)</h2>
        <p>
          The songs on the ryPod are the 30-second previews Apple Music offers. Nothing is loaded from Apple until you pick a song and say yes on
          the ryPod’s screen. From then on your browser fetches the previews, covers and song details straight from Apple, so Apple receives
          your IP address and browser details.
        </p>
        <p>
          Provider: Apple Distribution International Ltd., Hollyhill Industrial Estate, Hollyhill, Cork, Ireland. See{" "}
          <a href="https://www.apple.com/legal/privacy/" target="_blank" rel="noreferrer">
            Apple’s privacy policy
          </a>
          .
        </p>
        <p>
          Legal basis: your consent, Art. 6 (1)(a) GDPR. You can take it back any time by clearing this site’s data; the ryPod will simply
          ask again next time.
        </p>
      </section>

      <section>
        <h2>Links, email and Discord</h2>
        <p>
          Links to other sites (GitHub, the project demos, Apple Music, Sketchfab) do nothing until you click them; once you’re there, their own
          privacy policies apply. If you email me, I use your address and message only to reply to you. The Discord
          button just copies my username to your clipboard.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          You can ask what data about you there is, have it corrected or deleted, limit or object to how it’s used, get a copy to take
          elsewhere, and withdraw consent you gave (Art. 15 to 21 GDPR). Just write to the address above. You can also complain to a data
          protection authority, in Italy the{" "}
          <a href="https://www.garanteprivacy.it" target="_blank" rel="noreferrer">
            Garante per la protezione dei dati personali
          </a>{" "}
          (Art. 77 GDPR).
        </p>
      </section>
    </LegalPage>
  );
}
