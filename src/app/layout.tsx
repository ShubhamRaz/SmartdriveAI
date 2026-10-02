import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SMARTDRIVE AI — Intelligent Driver Safety Simulator",
  description:
    "Multi-Vehicle Intelligent Driver Monitoring, Risk Detection & Autonomous Safety Intervention Simulator. Detect Risk. Take Control. Prevent the Crash.",
  keywords: [
    "SMARTDRIVE AI",
    "driver monitoring",
    "drowsiness detection",
    "autonomous safety",
    "vehicle simulation",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070a10",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        {children}
      </body>
    </html>
  );
}
