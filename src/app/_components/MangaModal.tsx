// app/_components/MangaModal.tsx
'use client';

import { useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { MangaDetailsView } from './MangaDetailsView';
import { MangaDetail } from '~/server/api/routers/manga';

interface MangaModalProps {
  mangaId: number | null;
  isOpen: boolean;
  onClose: () => void;
  manga?: MangaDetail; // Replace 'any' with your manga type
}

export const MangaModal: React.FC<MangaModalProps> = ({
  isOpen,
  onClose,
  manga
}) => {
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [handleEscapeKey]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-0 z-50 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-h-screen px-4 flex items-center justify-center">
              <div className="bg-white rounded-lg w-full max-w-4xl relative">
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-full"
                >
                  <X size={24} />
                </button>
                <div className="max-h-[90vh] overflow-y-auto">
                  <MangaDetailsView manga={manga ?? null} isModal />
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};