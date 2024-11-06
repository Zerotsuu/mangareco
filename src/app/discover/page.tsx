// src/app/discover/page.tsx

import { DiscoverSection } from '~/app/_components/DiscoverSection';

export default function DiscoverPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Discover</h1>
       <p className="text-gray-600 mb-6">Based on the lists of similar users enjoyed</p>

      <DiscoverSection />
    </div>
  );
}