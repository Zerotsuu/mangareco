import "~/styles/globals.css";
import { ClerkProvider, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import { type Metadata } from "next";
import { Navbar } from "~/app/_components/Navbar";
import { Inter } from "next/font/google";
import { TRPCReactProvider } from "~/trpc/react";
import { redirect } from 'next/navigation';
import { api } from "~/trpc/server";
import React from "react";
import { ProfileModal } from "./_components/ProfileModal";

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
          <TRPCReactProvider>
            <Navbar />
            <main>
              <SignedIn>
                <ProfileModal/>
                {children}
              </SignedIn>
              <SignedOut>{children}</SignedOut>
            </main>
          </TRPCReactProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}