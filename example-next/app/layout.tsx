import Script from "next/script";
import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";

import "./globals.css";

const displayFont = DM_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"]
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"]
});

export const metadata: Metadata = {
  title: "creem-datafast example",
  description:
    "Minimal Next.js example for Creem checkout tracking and DataFast webhook forwarding."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${monoFont.variable}`}>
        {children}
        {process.env.DATAFAST_WEBSITE_ID && (
          <Script
            defer
            src="https://datafa.st/js/script.js"
            data-website-id={process.env.DATAFAST_WEBSITE_ID}
            data-domain={process.env.DATAFAST_DOMAIN}
            data-disable-payments="true"
            data-allow-localhost="true"
          />
        )}
      </body>
    </html>
  );
}
