import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono, Noto_Serif_KR } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  display: "swap",
});

// Korean serif to pair with Fraunces for headlines (glyph-level fallback).
const notoSerifKR = Noto_Serif_KR({
  weight: ["400", "600"],
  variable: "--font-noto-serif-kr",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Deep Insight Lab — Ten thousand reviews. One honest answer.",
  description:
    "Deep Insight Lab turns the chaos of consumer voices into evidence you can act on. A consumer-research company building tools that make honest answers inevitable.",
  metadataBase: new URL("https://deepinsightlab.example"),
  openGraph: {
    title: "Deep Insight Lab — Ten thousand reviews. One honest answer.",
    description:
      "We turn the chaos of consumer voices into evidence you can act on.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${plexMono.variable} ${notoSerifKR.variable} h-full`}
    >
      <body className="grain min-h-full antialiased">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
