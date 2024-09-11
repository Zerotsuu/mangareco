import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { cookies } from "next/headers";
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
    <html lang="en">
      <body className={`font-sans ${inter.variable}`}>
        <TRPCReactProvider >
          <Navbar />  {/* Navbar component*/}
          <main>{children}</main>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
