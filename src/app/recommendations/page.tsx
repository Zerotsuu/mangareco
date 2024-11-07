'use client';
import React from 'react';
import { MangaRecommendations } from '~/app/_components/Recommendations';
// import { MatrixFactorizationRecommendations } from '../_components/MatrixFactorizationRecommendations';
import { api } from '~/utils/api';

const RecommendationsPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Manga Recommendations</h1>
      <p className="text-gray-600 mb-6">
        Get personalized manga recommendations based on your reading list and preferences.
      </p>

      <MangaRecommendations />

      {/* Different recommendation types */}
      <div className="space-y-12">
        {/* Content-based recommendations */}
        {/* ... your existing recommendations ... */}

        {/* Matrix Factorization recommendations
        <MatrixFactorizationRecommendations />

        {/* Update model button */}
        {/* {(() => {
          const mutation = api.recommendation.updateRecommenderModel.useMutation();
          const recommendationsQuery = api.recommendation.getMatrixFactorizationRecommendations.useQuery(
            { limit: 10 },
            {
              retry: false
            }
          );
          return (
            <button
              onClick={async () => {
                try {
                  await mutation.mutateAsync();
                  window.alert('Model updated successfully!');
                  // Refetch recommendations after update
                  await recommendationsQuery.refetch();
                } catch (error) {
                  console.error('Failed to update model:', error);
                  window.alert('Failed to update model. Please try again.');
                }
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Updating...' : 'Update Recommendations'}
            </button>
          );
        })()} */}
      </div>
    </div>
  );
};

export default RecommendationsPage;