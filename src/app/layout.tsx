import type { Metadata } from "next";
import { Inter, Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { BannerAd } from "@/components/ads/banner-ad";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-heading",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Groove — AI Music Curator",
  description: "Your AI DJ agent for flow-optimized Spotify playlists.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${bricolageGrotesque.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col relative">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="fixed inset-0 -z-20 h-full w-full object-cover"
          style={{ filter: "brightness(0.18) saturate(0.6)" }}
        >
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>
        <div className="fixed inset-0 -z-10 bg-background/60" />
        <SiteHeader />
        {children}
        <BannerAd />
        <Toaster theme="dark" />
      </body>
    </html>
  );
}
