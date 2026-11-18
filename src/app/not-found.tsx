import type { Metadata } from "next";
import Link from "next/link";
import RollText from "@/components/RollText";

export const metadata: Metadata = {
  title: "404",
  description: "This page could not be found.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="nf">
      <Link href="/" className="nf-mark">
        ryhox
      </Link>
      <h1 className="nf-code" data-c="404">
        404<span className="sr-only">: page not found</span>
      </h1>
      <p className="nf-title">This page drifted off.</p>
      <p className="nf-sub">Like a cloud, it was here a second ago.</p>
      <Link href="/" className="nf-home chrome-pill">
        <RollText text="Back to the start" />
      </Link>
    </main>
  );
}
