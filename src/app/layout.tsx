import "~/styles/globals.css";
import { ClerkProvider } from '@clerk/nextjs'
import { type Metadata } from "next";
import { Navbar } from "~/app/_components/Navbar";
import { Inter } from "next/font/google";
import { TRPCReactProvider } from "~/trpc/react";
import { OnboardingCheck } from "~/app/_components/OnboardingCheck"; // Add this import

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "MangaReco",
  description: "Discover and explore manga recommendations",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const clerkPubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <html lang="en">
        <body className={`font-sans ${inter.variable}`}>
          <TRPCReactProvider>
            <OnboardingCheck> {/* Add this wrapper */}
              <Navbar />
              <main>{children}</main>
            </OnboardingCheck>
          </TRPCReactProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}