'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { api } from '~/utils/api';

export default function OnboardingPage() {
    const [experience, setExperience] = useState('');
    const router = useRouter();
    const { user } = useUser();

  const updateUserProfile = api.user.updateProfile.useMutation({
    onSuccess: () => {
      router.push('/'); // Redirect to home page after successful update
    },
    onError: (error) => {
      console.error('Failed to update profile:', error);
      // Handle the error, e.g., show an error message to the user
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      await user.update({
        unsafeMetadata: { readingExperience: experience },
      });
      updateUserProfile.mutate({ readingExperience: experience });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Welcome to MangaReco!</h1>
      <p className="mb-4">To help us provide better recommendations, please tell us about your manga reading experience:</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-2">
            <input
              type="radio"
              name="experience"
              value="newbie"
              checked={experience === 'newbie'}
              onChange={(e) => setExperience(e.target.value)}
              className="mr-2"
            />
            I&apos;m new to manga
          </label>
          <label className="block mb-2">
            <input
              type="radio"
              name="experience"
              value="casual"
              checked={experience === 'casual'}
              onChange={(e) => setExperience(e.target.value)}
              className="mr-2"
            />
            I read manga occasionally
          </label>
          <label className="block">
            <input
              type="radio"
              name="experience"
              value="experienced"
              checked={experience === 'experienced'}
              onChange={(e) => setExperience(e.target.value)}
              className="mr-2"
            />
            I&apos;m an experienced manga reader
          </label>
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          disabled={!experience}
        >
          Continue
        </button>
      </form>
    </div>
  );
  }
