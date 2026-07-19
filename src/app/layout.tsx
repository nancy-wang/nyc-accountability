import type { Metadata } from "next";
import { Barlow_Condensed, Bungee, Geist, Geist_Mono, JetBrains_Mono, Lora } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Loaded for the agency trading card's back face section labels, badges,
// and CTA button — used only there.
const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  weight: ["700", "800", "900"],
  subsets: ["latin"],
});

// Bungee is the site-wide display headline font (see --font-display in
// globals.css) — originally the agency trading card back face's ("Scorecard
// Slam Dunk" template) display font, now reused for every header.
const bungee = Bungee({
  variable: "--font-bungee",
  weight: "400",
  subsets: ["latin"],
});

// JetBrains Mono is still used by the agency trading card's own back-face
// typography, and by the homepage's topic-section labels (e.g. "Public
// Safety and Access to Justice"), which are deliberately kept in the mono
// "data" register rather than switching to the site's serif body font below.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

// Lora is the site-wide body font (see `body` in globals.css) — used for
// ordinary prose (paragraphs, descriptions) so it reads as a civic-data
// report rather than a terminal.
const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

// The real display headline font (Empirica TRIAL, from Frere-Jones Type) is
// under an evaluation-only trial license — not cleared for public/commercial
// use, and its files are gitignored (src/fonts/empirica-trial) so they don't
// even exist in deployed builds. Buy the retail license at frerejones.com,
// then restore the next/font/local loader here (see git history) to swap
// the real font back in; until then, the deployed build uses the plain CSS
// fallback set as --font-display in globals.css.

export const metadata: Metadata = {
  title: "NYC Performance Tracker",
  description: "Is the City hitting its own performance targets? Sourced from NYC's Mayor's Management Report data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${barlowCondensed.variable} ${bungee.variable} ${jetbrainsMono.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
