'use client';

import React, { useState } from 'react';
import { api } from '~/utils/api';
import { Loader2 } from 'lucide-react';

interface AddToListButtonProps {
  mangaId: number;
  onSuccess?: () => void;
}

export const AddToListButton: React.FC<AddToListButtonProps> = ({ mangaId, onSuccess }) => {
  const [status, setStatus] = useState('Plan to Read');
  const utils = api.useContext();

  const addToListMutation = api.mangaList.addToList.useMutation({
    onSuccess: () => {
      // Invalidate relevant queries
      void utils.manga.getById.invalidate({ id: mangaId });
      void utils.mangaList.getUserList.invalidate();
      onSuccess?.();
    }
  });

  const handleAddToList = async () => {
    try {
      await addToListMutation.mutateAsync({
        mangaId,
        status,
        likeStatus: null,
      });
    } catch (error) {
      console.error('Error adding manga to list:', error);
    }
  };

  return (
    <div className="flex items-center gap-2 ml-4">
      <select 
        value={status} 
        onChange={(e) => setStatus(e.target.value)}
        className="px-3 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        disabled={addToListMutation.isPending}
      >
        <option value="Plan to Read">Plan to Read</option>
        <option value="Reading">Reading</option>
        <option value="Completed">Completed</option>
      </select>
      
      <button 
        onClick={handleAddToList} 
        disabled={addToListMutation.isPending}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 
          text-white transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
      >
        {addToListMutation.isPending ? (
          <>
            <Loader2 className="animate-spin h-4 w-4" />
            Adding...
          </>
        ) : (
          'Add to List'
        )}
      </button>
    </div>
  );
};