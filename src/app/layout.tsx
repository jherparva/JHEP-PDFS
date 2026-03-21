import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#dc2626",
};

export const metadata: Metadata = {
  title: "JHEP | Editor Inteligente",
  description: "Organizador y Editor Profesional de PDFs con tecnología JHEP.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/jhep_final_icon.png", type: "image/png" },
      { url: "/jhep_final_icon.ico", type: "image/x-icon" },
    ],
    shortcut: "/jhep_final_icon.png",
    apple: "/jhep_final_icon.png",
    other: [
      {
        rel: "apple-touch-icon-precomposed",
        url: "/jhep_final_icon.ico",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "JHEP",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
