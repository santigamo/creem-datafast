import Script from "next/script";
import type { Metadata } from "next";
import { Cormorant_Garamond, IBM_Plex_Mono } from "next/font/google";

import "./globals.css";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"]
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"]
});

export const metadata: Metadata = {
  title: "creem-datafast example",
  description: "Minimal Next.js example for Creem checkout tracking and DataFast webhook forwarding."
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
            data-allow-localhost="true"
          />
        )}
      </body>
    </html>
  );
}
