import React from 'react';
import { Book, ExternalLink } from 'lucide-react';

interface LicensedMangaSourcesProps {
  mangaTitle: string;
}

const LicensedMangaSources: React.FC<LicensedMangaSourcesProps> = ({ mangaTitle }) => {
  const formatSearchQuery = (title: string): string => {
    return encodeURIComponent(title.trim());
  };

  return (
    <div className="space-y-6">
      {/* Free Official Source */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Read Official Free Chapters</h3>
        <a
          href={`https://mangaplus.shueisha.co.jp/search_result?keyword=${formatSearchQuery(mangaTitle)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-2 p-2 bg-blue-50 hover:bg-blue-100 rounded-md text-blue-700"
        >
          <Book className="w-5 h-5" />
          <span>MANGA Plus by SHUEISHA</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Digital Purchase Options */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Buy Digital Manga</h3>
        <div className="grid grid-cols-2 gap-2">
          <a
            href={`https://www.kobo.com/ph/en/search?query=${formatSearchQuery(mangaTitle)}&fclanguages=en`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 p-2 bg-gray-50 hover:bg-gray-100 rounded-md"
          >
            <Book className="w-4 h-4" />
            <span>Kobo</span>
            <ExternalLink className="w-3 h-3 text-gray-400" />
          </a>
          
          <a
            href={`https://global.bookwalker.jp/search/?word=${formatSearchQuery(mangaTitle)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 p-2 bg-gray-50 hover:bg-gray-100 rounded-md"
          >
            <Book className="w-4 h-4" />
            <span>BookWalker</span>
            <ExternalLink className="w-3 h-3 text-gray-400" />
          </a>

          <a
            href={`https://www.amazon.com/s?k=${formatSearchQuery(mangaTitle)}&i=digital-text&rh=n:156104011`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 p-2 bg-gray-50 hover:bg-gray-100 rounded-md"
          >
            <Book className="w-4 h-4" />
            <span>Amazon Kindle</span>
            <ExternalLink className="w-3 h-3 text-gray-400" />
          </a>

          <a
            href={`https://www.viz.com/search?search=${formatSearchQuery(mangaTitle)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 p-2 bg-gray-50 hover:bg-gray-100 rounded-md"
          >
            <Book className="w-4 h-4" />
            <span>VIZ Media</span>
            <ExternalLink className="w-3 h-3 text-gray-400" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default LicensedMangaSources;