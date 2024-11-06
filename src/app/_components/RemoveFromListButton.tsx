import React from 'react';
import { api } from '~/utils/api';
import { Trash2, Loader2 } from 'lucide-react';

interface RemoveFromListButtonProps {
  mangaId: number;
  onSuccess?: () => void;
}

export const RemoveFromListButton: React.FC<RemoveFromListButtonProps> = ({ 
  mangaId, 
  onSuccess 
}) => {
  const utils = api.useContext();

  const removeMutation = api.mangaList.removeFromList.useMutation({
    onSuccess: () => {
      // Invalidate relevant queries
      void utils.manga.getById.invalidate({ id: mangaId });
      void utils.mangaList.getUserList.invalidate();
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Error removing manga from list:', error);
    }
  });

  const handleRemove = () => {
    if (!removeMutation.isPending) {
      removeMutation.mutate({ mangaId });
    }
  };

  return (
    <button
      onClick={handleRemove}
      className={`ml-4 flex items-center gap-2 px-4 py-2 rounded-lg 
        transition-all duration-200
        ${removeMutation.isPending 
          ? 'bg-red-300 cursor-not-allowed' 
          : 'bg-red-500 hover:bg-red-600'
        } text-white`}
      disabled={removeMutation.isPending}
      title="Remove from List"
    >
      {removeMutation.isPending ? (
        <>
          <Loader2 className="animate-spin" size={20} />
          <span>Removing...</span>
        </>
      ) : (
        <>
          <Trash2 size={20} />
          <span>Remove</span>
        </>
      )}
    </button>
  );
};