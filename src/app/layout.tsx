import "~/styles/globals.css";
import { ClerkProvider, SignedIn, SignedOut} from '@clerk/nextjs'
import { type Metadata } from "next";
import { Navbar } from "~/app/_components/Navbar";
import { Inter } from "next/font/google";
import { TRPCReactProvider } from "~/trpc/react";
import React from "react";
import { ProfileModal } from "./_components/ProfileModal";
import { MangaModalProvider } from "./_contexts/MangaModalContext";

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
            <MangaModalProvider>
              <Navbar />
              <main>
                <SignedIn>
                  <ProfileModal/>
                  {children}
                </SignedIn>
                <SignedOut>{children}</SignedOut>
              </main>
            </MangaModalProvider>
          </TRPCReactProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}