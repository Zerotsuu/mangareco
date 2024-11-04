'use client';
import React from 'react';
import { MangaRecommendations } from '~/app/_components/Recommendations';
import { RecommendationSettings } from '../_components/RecommendationSettings';

const RecommendationsPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Manga Recommendations</h1>
      <p className="text-gray-600 mb-6">
        Get personalized manga recommendations based on your reading list and preferences.
      </p>
      <div className="mb-8">
        <RecommendationSettings />
      </div>
      <MangaRecommendations />
    </div>
  );
};

export default RecommendationsPage;