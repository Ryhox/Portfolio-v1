import type { Metadata, Viewport } from "next";
import { Bungee, Manrope, Orbitron } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";
import { THEME_SCRIPT } from "@/lib/theme";

// Y2K type: blocky Bungee for the big chrome headlines, Orbitron for buttons and labels.
const display = Bungee({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

const ui = Orbitron({
  variable: "--font-ui",
  subsets: ["latin"],
});

const sans = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

const SITE = "https://ryhox.dev";
const TITLE = "ryhox | Creative developer";
const DESCRIPTION =
  "ryhox is a creative developer building playful, tactile things for the web: interactive Three.js worlds, WebGL experiments, apps people use every day and Minecraft mods. Comes with a working iPod.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: TITLE, template: "%s | ryhox" },
  description: DESCRIPTION,
  applicationName: "ryhox",
  authors: [{ name: "ryhox", url: "https://github.com/Ryhox" }],
  creator: "ryhox",
  publisher: "ryhox",
  keywords: [
    "ryhox",
    "creative developer",
    "creative coding",
    "three.js portfolio",
    "3d portfolio",
    "webgl",
    "react three fiber",
    "next.js",
    "interactive website",
    "y2k design",
    "frontend developer",
    "web developer portfolio",
    "stargazer islands",
    "fabric minecraft mod",
    "ollama",
  ],
  category: "technology",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "ryhox",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-video-preview": -1, "max-snippet": -1 },
  },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  // The top of the sky (day / night), so the browser bar blends into the page. The theme switch keeps it in sync.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2f7fe2" },
    { media: "(prefers-color-scheme: dark)", color: "#050b1f" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  // Edge to edge on notched phones (the nav and the corners keep to the safe area).
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Start fetching the 3D model with the HTML instead of after the JS has booted.
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning className={`${sans.variable} ${display.variable} ${ui.variable}`}>
      <head>
        {/* Day or night before the first paint: the saved choice, else the system's. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
