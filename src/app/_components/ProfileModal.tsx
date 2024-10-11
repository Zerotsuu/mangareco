'use client';
import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Modal } from './Modal';
import { ProfileForm } from './ProfileForm';
import { api } from '~/utils/api';

export const ProfileModal: React.FC = () => {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  const { data: profile, isLoading } = api.userProfile.getUserProfile.useQuery();

  useEffect(() => {
    if (user && !isLoading && !profile && user.createdAt) {
      const creationTime = new Date(user.createdAt);
      const now = new Date();
      const hoursSinceCreation = (now.getTime() - creationTime.getTime()) / (1000 * 60 * 60);

      if (hoursSinceCreation < 5) {
        setIsOpen(true);
      }
    }
  }, [user, profile, isLoading]);

  const handleComplete = () => {
    setIsOpen(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ProfileForm onComplete={handleComplete} />
    </Modal>
  );
};