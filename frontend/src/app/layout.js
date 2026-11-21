import { Baloo_2, Noto_Sans_Devanagari, Nunito } from "next/font/google";
import Providers from "./providers";
import "./globals.css";

// Round, friendly body text.
const body = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Bubbly headings, in English and Hindi.
const display = Baloo_2({
  variable: "--font-display",
  subsets: ["latin", "devanagari"],
  weight: ["500", "600", "700", "800"],
});

const devanagari = Noto_Sans_Devanagari({
  variable: "--font-deva",
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Fab_art Studio",
  description: "Boutique order management for Fab_art Studio",
  applicationName: "Fab_art Studio",
  appleWebApp: {
    capable: true,
    title: "Fab_art",
    statusBarStyle: "default",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fff7f1",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="hi"
      suppressHydrationWarning
      className={`${body.variable} ${display.variable} ${devanagari.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
