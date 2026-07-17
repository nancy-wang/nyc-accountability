import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

// The real display headline font (Empirica TRIAL, from Frere-Jones Type) is
// under an evaluation-only trial license — not cleared for public/commercial
// use, and its files are gitignored (src/fonts/empirica-trial) so they don't
// even exist in deployed builds. Buy the retail license at frerejones.com,
// then restore the next/font/local loader here (see git history) to swap
// the real font back in; until then, the deployed build uses the plain CSS
// fallback set as --font-display in globals.css.

export const metadata: Metadata = {
  title: "NYC Accountability",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
