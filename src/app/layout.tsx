import type { Metadata } from "next";
import { Cormorant_Upright, Cinzel_Decorative, Italiana, Lora, Jost } from "next/font/google";
import "./globals.css";

const cormorantUpright = Cormorant_Upright({
  variable: "--font-cormorant-upright",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const cinzelDecorative = Cinzel_Decorative({
  variable: "--font-cinzel-decorative",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const italiana = Italiana({
  variable: "--font-italiana",
  subsets: ["latin"],
  weight: ["400"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Adun & Uche — #TheSweetUnion",
  description: "A custom wedding website and wishlist for Adun & Uche's celebration. Celebrate our sweet union with us.",
};

import PressedStampCursor from "@/components/PressedStampCursor";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorantUpright.variable} ${cinzelDecorative.variable} ${italiana.variable} ${lora.variable} ${jost.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col">
        <PressedStampCursor />
        {children}
      </body>
    </html>
  );
}
