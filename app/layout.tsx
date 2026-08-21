import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

const siteUrl = "https://watermark-cleanup.madanmohanlearning.workers.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Watermark Cleanup",
    template: "%s | Watermark Cleanup",
  },
  description:
    "Privacy-first cleanup for images, PDFs, and text you own or are authorized to edit. Review detected overlays before exporting a cleaned copy.",
  applicationName: "Watermark Cleanup",
  keywords: [
    "watermark cleanup",
    "overlay removal",
    "image cleanup",
    "PDF cleanup",
    "privacy-first file processing",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Watermark Cleanup",
    title: "Watermark Cleanup",
    description:
      "Review detected overlays and clean authorized images, PDFs, and text with a privacy-first workflow.",
  },
  twitter: {
    card: "summary",
    title: "Watermark Cleanup",
    description:
      "Privacy-first overlay cleanup for authorized images, PDFs, and text with review before export.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} h-full`}>
      <body className="min-h-full bg-[#f4efe6] font-sans text-stone-900 antialiased">{children}</body>
    </html>
  );
}
