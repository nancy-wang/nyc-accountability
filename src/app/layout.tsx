import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
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

// FRERE-JONES TYPE TRIAL LICENSE — evaluation only, not licensed for public or
// commercial use. Never deploy this build publicly or commit src/fonts/empirica-trial
// (gitignored). Buy the retail license at frerejones.com before shipping this site.
const displayFont = localFont({
  variable: "--font-display",
  src: [
    { path: "../fonts/empirica-trial/EmpiricaTRIALHeadline-Bold.otf", weight: "700", style: "normal" },
    { path: "../fonts/empirica-trial/EmpiricaTRIALHeadline-BoldItalic.otf", weight: "700", style: "italic" },
    { path: "../fonts/empirica-trial/EmpiricaTRIALHeadline-Black.otf", weight: "900", style: "normal" },
  ],
});

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
      className={`${geistSans.variable} ${geistMono.variable} ${displayFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
