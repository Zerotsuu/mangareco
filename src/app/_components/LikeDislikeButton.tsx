import React from 'react';
import { api } from '~/utils/api';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface LikeDislikeButtonProps {
  mangaId: number;
  initialLikeStatus: 'like' | 'dislike' | null;
}

export const LikeDislikeButton: React.FC<LikeDislikeButtonProps> = ({ mangaId, initialLikeStatus }) => {
  const [likeStatus, setLikeStatus] = React.useState<'like' | 'dislike' | null>(initialLikeStatus);

  const likeMutation = api.mangaList.updateLikeStatus.useMutation({
    onSuccess: (data) => {
      if (data) {
        if (data.likeStatus === 'like' || data.likeStatus === 'dislike' || data.likeStatus === null) {
          setLikeStatus(data.likeStatus);
        } else {
          console.error('Invalid likeStatus received from server:', data.likeStatus);
        }
      }
    },
  });

  const handleLike = () => {
    likeMutation.mutate({ mangaId, likeStatus: likeStatus === 'like' ? null : 'like' });
  };

  const handleDislike = () => {
    likeMutation.mutate({ mangaId, likeStatus: likeStatus === 'dislike' ? null : 'dislike' });
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleLike}
        className={`p-2 rounded-full ${likeStatus === 'like' ? 'bg-green-500' : 'bg-gray-200'}`}
      >
        <ThumbsUp size={24} color={likeStatus === 'like' ? 'white' : 'black'} />
      </button>
      <button
        onClick={handleDislike}
        className={`p-2 rounded-full ${likeStatus === 'dislike' ? 'bg-red-500' : 'bg-gray-200'}`}
      >
        <ThumbsDown size={24} color={likeStatus === 'dislike' ? 'white' : 'black'} />
      </button>
    </div>
  );
};