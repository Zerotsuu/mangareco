import React from 'react';
import { api } from '~/utils/api';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface LikeDislikeButtonProps {
  mangaId: number;
  initialLikeStatus: 'like' | 'dislike' | null;
  onSuccess?: () => void;
}

export const LikeDislikeButton: React.FC<LikeDislikeButtonProps> = ({ 
  mangaId, 
  initialLikeStatus,
  onSuccess 
}) => {
  const [likeStatus, setLikeStatus] = React.useState<'like' | 'dislike' | null>(initialLikeStatus);
  const utils = api.useContext();

  const likeMutation = api.mangaList.updateLikeStatus.useMutation({
    onSuccess: (data) => {
      if (data) {
        if (data.likeStatus === 'like' || data.likeStatus === 'dislike' || data.likeStatus === null) {
          setLikeStatus(data.likeStatus);
          // Invalidate relevant queries
          void utils.manga.getById.invalidate({ id: mangaId });
          void utils.mangaList.getUserList.invalidate();
          onSuccess?.();
        } else {
          console.error('Invalid likeStatus received from server:', data.likeStatus);
        }
      }
    },
  });

  const handleLike = () => {
    if (!likeMutation.isPending) {
      likeMutation.mutate({ mangaId, likeStatus: likeStatus === 'like' ? null : 'like' });
    }
  };

  const handleDislike = () => {
    if (!likeMutation.isPending) {
      likeMutation.mutate({ mangaId, likeStatus: likeStatus === 'dislike' ? null : 'dislike' });
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleLike}
        disabled={likeMutation.isPending}
        className={`p-2 rounded-full transition-all duration-200 ${
          likeStatus === 'like' 
            ? 'bg-green-500 hover:bg-green-600' 
            : 'bg-gray-200 hover:bg-gray-300'
        } ${likeMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={likeStatus === 'like' ? 'Remove Like' : 'Like'}
      >
        <ThumbsUp 
          size={24} 
          className={`${
            likeMutation.isPending ? 'animate-pulse' : ''
          }`}
          color={likeStatus === 'like' ? 'white' : 'black'} 
        />
      </button>
      <button
        onClick={handleDislike}
        disabled={likeMutation.isPending}
        className={`p-2 rounded-full transition-all duration-200 ${
          likeStatus === 'dislike' 
            ? 'bg-red-500 hover:bg-red-600' 
            : 'bg-gray-200 hover:bg-gray-300'
        } ${likeMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={likeStatus === 'dislike' ? 'Remove Dislike' : 'Dislike'}
      >
        <ThumbsDown 
          size={24} 
          className={`${
            likeMutation.isPending ? 'animate-pulse' : ''
          }`}
          color={likeStatus === 'dislike' ? 'white' : 'black'} 
        />
      </button>
    </div>
  );
};