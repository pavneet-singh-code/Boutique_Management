import { Geist, Noto_Sans_Devanagari } from "next/font/google";
import Providers from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
  themeColor: "#ffffff",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="hi"
      suppressHydrationWarning
      className={`${geistSans.variable} ${devanagari.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
