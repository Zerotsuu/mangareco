// app/layout.tsx
import "~/styles/globals.css";

import { ClerkProvider } from '@clerk/nextjs'
import { type Metadata } from "next";
import { Navbar } from "~/app/_components/Navbar";
import { Inter } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "MangaReco",
  description: "Discover and explore manga recommendations",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
    <html lang="en">
      <body className={`font-sans ${inter.variable}`}>
        <TRPCReactProvider >
          <Navbar />  {/* Navbar component*/}
          <main>{children}</main>
        </TRPCReactProvider>
      </body>
    </html>
    </ClerkProvider>
  );
}
