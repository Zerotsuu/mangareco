// app/_components/MangaTabs.tsx
'use client';

import { useState } from 'react';
import { MangaGrid } from './MangaGrid';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '~/utils/api';

interface TabConfig {
  id: 'trending' | 'allTimePopular' | 'top100';
  label: string;
  queryType: 'trending' | 'allTimePopular' | 'top100';
}

const tabs: TabConfig[] = [
  {
    id: 'trending',
    label: 'TRENDING NOW',
    queryType: 'trending'
  },
  {
    id: 'allTimePopular',
    label: 'ALL TIME POPULAR',
    queryType: 'allTimePopular'
  },
  {
    id: 'top100',
    label: 'TOP 100',
    queryType: 'top100'
  }
];

export const MangaTabs = () => {
  const [activeTab, setActiveTab] = useState<TabConfig['id']>('trending');
  const [pages, setPages] = useState({
    trending: 1,
    allTimePopular: 1,
    top100: 1
  });

  // Get query data for active tab
  const queryData = (() => {
    switch (activeTab) {
      case 'trending':
        return api.manga.getTrending.useQuery({ page: pages.trending, perPage: 18 });
      case 'allTimePopular':
        return api.manga.getAllTimePopular.useQuery({ page: pages.allTimePopular, perPage: 18 });
      case 'top100':
        return api.manga.getTop100.useQuery({ page: pages.top100, perPage: 18 });
    }
  })();

  const handlePageChange = (increment: boolean) => {
    setPages(prev => ({
      ...prev,
      [activeTab]: increment ? prev[activeTab] + 1 : prev[activeTab] - 1
    }));
  };

  // Reset page when changing tabs
  const handleTabChange = (tabId: TabConfig['id']) => {
    if (tabId !== activeTab) {
      setActiveTab(tabId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                relative pb-4 text-sm font-semibold tracking-wide
                transition-colors duration-200
                ${activeTab === tab.id
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600" />
              )}
            </button>
          ))}
        </div>

        {/* <a 
          href={`/${activeTab}`}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </a> */}
      </div>

      {/* Content Area */}
      <div className="min-h-[200px] relative">

        {/* Manga Grid */}
        <div className="space-y-8">
          <MangaGrid 
            queryType={activeTab}
            showPagination={false}
            perPage={18}
            currentPage={pages[activeTab]}
          />

          {/* Pagination Controls */}
          {queryData.data?.pageInfo && (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => handlePageChange(false)}
                disabled={pages[activeTab] === 1}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg
                         text-gray-700 bg-white hover:bg-gray-50 
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors duration-200"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <span className="text-sm text-gray-600">
                Page {pages[activeTab]} of {queryData.data.pageInfo.lastPage}
              </span>

              <button
                onClick={() => handlePageChange(true)}
                disabled={!queryData.data.pageInfo.hasNextPage}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg
                         text-gray-700 bg-white hover:bg-gray-50 
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors duration-200"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};