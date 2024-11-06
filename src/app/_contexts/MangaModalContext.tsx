// app/_contexts/MangaModalContext.tsx
'use client';

import { createContext, useContext, useState } from 'react';
import { MangaModal } from '../_components/MangaModal';
import { api } from '~/utils/api';

interface MangaModalContextType {
  openMangaModal: (mangaId: number) => void;
  closeMangaModal: () => void;
}

const MangaModalContext = createContext<MangaModalContextType | undefined>(undefined);

export function MangaModalProvider({ children }: { children: React.ReactNode }) {
  const [selectedMangaId, setSelectedMangaId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: manga } = api.manga.getById.useQuery(
    { id: selectedMangaId! },
    { enabled: !!selectedMangaId }
  );

  const openMangaModal = (mangaId: number) => {
    setSelectedMangaId(mangaId);
    setIsModalOpen(true);
  };

  const closeMangaModal = () => {
    setIsModalOpen(false);
    setSelectedMangaId(null);
  };

  return (
    <MangaModalContext.Provider value={{ openMangaModal, closeMangaModal }}>
      {children}
      <MangaModal
        mangaId={selectedMangaId}
        isOpen={isModalOpen}
        onClose={closeMangaModal}
        manga={manga}
      />
    </MangaModalContext.Provider>
  );
}

export function useMangaModal() {
  const context = useContext(MangaModalContext);
  if (context === undefined) {
    throw new Error('useMangaModal must be used within a MangaModalProvider');
  }
  return context;
}