import React from 'react';
import { api } from '~/utils/api';
import { Trash2 } from 'lucide-react';


interface RemoveFromListButtonProps {
  mangaId: number;
}

export const RemoveFromListButton: React.FC<RemoveFromListButtonProps> = ({ mangaId}) => {
  const removeMutation = api.mangaList.removeFromList.useMutation();

  const handleRemove =  () => {
    try {
       removeMutation.mutate({
        mangaId,
      });
      alert('Manga removed from your list!');
    } catch (error) {
      console.error('Error adding manga to list:', error);
      alert('Failed to remove manga to your list. Please try again.');
    }
  };

  return (
    <button
      onClick={handleRemove}
      className="p-2 rounded-full bg-red-500 hover:bg-red-600 text-white"
      disabled={removeMutation.isPending}
    >
      <Trash2 size={20} />
    </button>
  );
};