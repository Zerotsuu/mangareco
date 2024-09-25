'use client';

import React, { useState } from 'react';
import { api } from '~/utils/api';

interface AddToListButtonProps {
  mangaId: number;
}

export const AddToListButton: React.FC<AddToListButtonProps> = ({ mangaId }) => {
  const [status, setStatus] = useState('Plan to Read');

  const addToListMutation = api.mangaList.addToList.useMutation();

  const handleAddToList = async () => {
    try {
      await addToListMutation.mutateAsync({
        mangaId,
        status,
      });
      alert('Manga added to your list!');
    } catch (error) {
      console.error('Error adding manga to list:', error);
      alert('Failed to add manga to your list. Please try again.');
    }
  };

  return (
    <div>
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="Plan to Read">Plan to Read</option>
        <option value="Reading">Reading</option>
        <option value="Completed">Completed</option>
      </select>
      <button onClick={handleAddToList} className="p-2 rounded-full bg-green-500 hover:bg-green-600 text-white"
      disabled={addToListMutation.isPending}>
        Add to List
      </button>
    </div>
  );
};