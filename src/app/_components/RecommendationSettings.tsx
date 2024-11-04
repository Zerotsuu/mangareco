'use client';

import React, { useState, useEffect } from 'react';
import { api } from '~/utils/api';
import type { RecommenderConfigInput } from '~/server/api/routers/userProfile';
import { DEFAULT_CONFIG } from '~/server/services/recommendations/types';

export const RecommendationSettings: React.FC = () => {
  const [config, setConfig] = useState<RecommenderConfigInput>(DEFAULT_CONFIG);
  const [isInitialized, setIsInitialized] = useState(false);

  // Get current settings
  const { data: savedSettings, error: settingsError, isLoading: isLoadingSettings } = 
  api.userProfile.getRecommendationSettings.useQuery(
    undefined,
    {
        enabled: !isInitialized,
      }
  );
  useEffect(() => {
    if (!isLoadingSettings && !isInitialized) {
      if (savedSettings) {
        setConfig(savedSettings);
      } else if (settingsError) {
        console.error('Error loading settings:', settingsError);
        setConfig(DEFAULT_CONFIG);
      }
      setIsInitialized(true);
    }
  }, [isLoadingSettings, isInitialized, savedSettings, settingsError]);

  const updateSettingsMutation = api.userProfile.updateRecommendationSettings.useMutation({
    onSuccess: () => {
      alert('Settings updated successfully!');
    },
    onError: (error) => {
      alert(`Failed to update settings: ${error.message}`);
    },
  });

  const handleSave = () => {
    updateSettingsMutation.mutate(config);
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
  };

  const handleSliderChange = (
    key: keyof RecommenderConfigInput,
    value: number,
    isNegative = false
  ) => {
    setConfig(prev => ({
      ...prev,
      [key]: isNegative ? -value : value,
    }));
  };

  if (!isInitialized) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 text-center">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Recommendation Settings</h2>
        <p className="text-gray-600">
          Customize how recommendations are generated for you
        </p>
      </div>

      <div className="space-y-6">
        {/* Genre Importance */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Genre Importance: {config.genreImportance.toFixed(1)}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={config.genreImportance}
            onChange={(e) => handleSliderChange('genreImportance', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <p className="text-sm text-gray-500 mt-1">
            How much weight to give to your favorite genres
          </p>
        </div>

        {/* Theme Importance */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Theme Importance: {config.themeImportance.toFixed(1)}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={config.themeImportance}
            onChange={(e) => handleSliderChange('themeImportance', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <p className="text-sm text-gray-500 mt-1">
            How much weight to give to themes and content elements
          </p>
        </div>

        {/* Score Importance */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Score Importance: {config.scoreImportance.toFixed(1)}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={config.scoreImportance}
            onChange={(e) => handleSliderChange('scoreImportance', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <p className="text-sm text-gray-500 mt-1">
            How much to consider average user ratings
          </p>
        </div>

        {/* Like/Dislike Impact */}
        <div>
          <h3 className="text-sm font-medium mb-4">Like/Dislike Impact</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-2">
                Like weight: {config.weightLikes.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="3"
                step="0.1"
                value={config.weightLikes}
                onChange={(e) => handleSliderChange('weightLikes', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">
                Dislike weight: {Math.abs(config.weightDislikes).toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="3"
                step="0.1"
                value={Math.abs(config.weightDislikes)}
                onChange={(e) => handleSliderChange('weightDislikes', parseFloat(e.target.value), true)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-4 mt-6">
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={updateSettingsMutation.isPending}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
          >
            {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};