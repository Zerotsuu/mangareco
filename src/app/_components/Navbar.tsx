// app/_components/Navbar.tsx
import React from 'react';
import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { SearchBar } from './SearchBar';

export const Navbar: React.FC = () => {
  return (
    <nav className="bg-gray-800 p-4">
      <div className="container mx-auto flex justify-between items-center align-middle">
        <Link href="/" className="text-white text-xl font-bold">
          MangaRec
        </Link>
        <div className="flex space-x-4 items-center">
          <SearchBar />
          <Link href="/" className="text-white">
            Popular
          </Link>
          <Link href="/discover" className="text-white">
            Discover
          </Link>
          <Link href="/recommendations" className="text-white">
            Recommendations
          </Link>
          <Link href="/list" className="text-white">
            Your List
          </Link>
          <Link href="/login" className="text-white">
            Profile
          </Link>
          
          <div>
            <SignedOut><div className='text-white border rounded-md p-1'><SignInButton mode="modal" /></div></SignedOut>
            <SignedIn><UserButton /></SignedIn>
          </div>
        </div>
      </div>
    </nav>
  );
};