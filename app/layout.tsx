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

export const metadata: Metadata = {
  title: "Watermark Cleanup",
  description: "Upload your own or authorized media, review detected overlays, and export a clean version.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} h-full`}>
      <body className="min-h-full bg-[#f4efe6] font-sans text-stone-900 antialiased">{children}</body>
    </html>
  );
}
