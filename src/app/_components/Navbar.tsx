import React from 'react';
import Link from 'next/link';

export const Navbar: React.FC = () => {
  return (
    <nav className="bg-gray-800 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-white text-xl font-bold">
          MangaRec
        </Link>
        <div className="flex space-x-4">
          <input
            type="text"
            placeholder="Search manga..."
            className="px-2 py-1 rounded"
          />
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
        </div>
      </div>
    </nav>
  );
};