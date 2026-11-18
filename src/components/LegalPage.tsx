import type { ReactNode } from "react";
import Link from "next/link";

// The frame the legal and privacy pages share: the brand and a way back, and the page as a folder on the
// sky (a blue-grey back with its tab on the left, the white front rising to the right in an S-curve).
export default function LegalPage({ title, lead, updated, children }: { title: string; lead: string; updated: string; children: ReactNode }) {
  return (
    <main className="legal">
      <header className="legal-top">
        <Link href="/" className="legal-mark">
          ryhox
        </Link>
        <Link href="/" className="legal-back nav-pill">
          Back
        </Link>
      </header>
      <article className="folder">
        <div className="folder-back" aria-hidden>
          <span>{title}</span>
        </div>
        <div className="folder-front">
          <svg className="folder-shoulder" viewBox="0 0 100 56" preserveAspectRatio="none" aria-hidden>
            <path d="M0 56C46 56 44 0 100 0V56Z" />
          </svg>
          <span className="folder-lip" aria-hidden />
          <h1>{title}</h1>
          <p className="legal-lead">{lead}</p>
          {children}
          <footer className="legal-foot">
            <span>Last updated {updated}</span>
            <nav>
              <Link href="/legal">Legal</Link>
              <Link href="/privacy">Privacy</Link>
            </nav>
          </footer>
        </div>
      </article>
    </main>
  );
}
