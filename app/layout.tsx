import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stripo Email Editor",
  description: "Custom Stripo Email Editor Integration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {/* Load zone.js early - required for Stripo (Angular-based) */}
        <Script
          src="https://unpkg.com/zone.js@0.14.3/dist/zone.min.js"
          strategy="beforeInteractive"
          id="zone-js-script"
        />
        {children}
      </body>
    </html>
  );
}
