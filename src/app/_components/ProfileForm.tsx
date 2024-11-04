'use client';

import React, { useState, useEffect } from 'react';
import { api } from '~/utils/api';

interface ProfileFormProps {
  onComplete: () => void;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({ onComplete }) => {
  const [experience, setExperience] = useState('');
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);

  const profileStatus = React.useMemo(() => ({
    currentProfile: { experience: '', favoriteGenres: [] }
  }), []);
  const isLoadingStatus = false;

  // Load existing profile data if it exists
  useEffect(() => {
    if (profileStatus?.currentProfile) {
      setExperience(profileStatus.currentProfile.experience);
      setFavoriteGenres(profileStatus.currentProfile.favoriteGenres);
    }
  }, [profileStatus]);

  const createProfileMutation = api.userProfile.createProfile.useMutation({
    onSuccess: () => {
      onComplete();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createProfileMutation.mutateAsync({
      experience: experience as "new" | "intermediate" | "experienced",
      favoriteGenres,
    });
  };

  if (isLoadingStatus) {
    return <div>Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">
        {profileStatus? 'Update Your Profile' : 'Create Your Profile'}
      </h2>
      
      <div>
        <label className="block mb-2">Reading Experience</label>
        <select
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          className="w-full p-2 border rounded"
          required
        >
          <option value="">Select your experience</option>
          <option value="new">New to manga</option>
          <option value="intermediate">Read some manga</option>
          <option value="experienced">Experienced reader</option>
        </select>
      </div>

      <div>
        <label className="block mb-2">Favorite Genres</label>
        {['Action', 'Romance', 'Comedy', 'Drama', 'Fantasy'].map((genre) => (
          <label key={genre} className="block">
            <input
              type="checkbox"
              checked={favoriteGenres.includes(genre)}
              onChange={() => {
                setFavoriteGenres((prev) =>
                  prev.includes(genre)
                    ? prev.filter((g) => g !== genre)
                    : [...prev, genre]
                );
              }}
            /> {genre}
          </label>
        ))}
      </div>

      <button 
        type="submit" 
        className="bg-blue-500 text-white p-2 rounded w-full"
        disabled={createProfileMutation.isPending}
      >
        {createProfileMutation.isPending 
          ? 'Saving...' 
          : profileStatus? 'Update Profile' : 'Create Profile'
        }
      </button>
    </form>
  );
};