import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

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
      className={`${fraunces.variable} ${inter.variable} ${plexMono.variable} h-full`}
    >
      <body className="grain min-h-full antialiased">{children}</body>
    </html>
  );
}
