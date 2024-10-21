'use client';
import React from 'react';
import { MangaRecommendations } from '~/app/_components/Recommendations';

const RecommendationsPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Manga Recommendations</h1>
      <MangaRecommendations />
      {/* You can add more components or content here */}
    </div>
  );
};

export default RecommendationsPage;