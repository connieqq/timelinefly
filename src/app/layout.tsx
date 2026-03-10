import type { Metadata } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import "@/app/globals.css";

const heading = Fraunces({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700"],
  adjustFontFallback: false
});

const body = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  adjustFontFallback: false
});

export const metadata: Metadata = {
  title: "TimelineFly",
  description: "Daily timeline review tool"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${heading.variable} ${body.variable}`}>{children}</body>
    </html>
  );
}
