import React from 'react';

interface MangaDescriptionProps {
  description: string;
}

const MangaDescription: React.FC<MangaDescriptionProps> = ({ description }) => {
  const formatDescription = (text: string): string => {
    return text
      // Handle HTML entities
      .replace(/&rdquo;/g, '"')
      .replace(/&ldquo;/g, '"')
      .replace(/&quot;/g, '"')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&apos;/g, "'")
      .replace(/&#039;/g, "'")
      .replace(/&#x27;/g, "'")
      // Handle line breaks
      .replace(/<br>/g, '\n')
      .replace(/<br\/>/g, '\n')
      .replace(/<br \/>/g, '\n')
      // Format source consistently
      .replace(/\(\s*Source:\s*([^)]+)\)/g, '\n\nSource: $1')
      // Handle Notes section
      .replace(/\s*Notes:/, '\n\nNotes:')
      // Remove other HTML tags
      .replace(/<\/?[^>]+(>|$)/g, '')
      // Clean up extra whitespace and newlines
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/^\s+|\s+$/g, '')
      .trim();
  };

  const mainContent: string[] = [];
  const sourceAndNotes: string[] = [];

  const sections = formatDescription(description).split('\n\n');
  
  sections.forEach((section) => {
    const trimmedSection = section.trim();
    if (trimmedSection.startsWith('Source:') || trimmedSection.startsWith('Notes:')) {
      sourceAndNotes.push(trimmedSection);
    } else if (trimmedSection) {
      mainContent.push(trimmedSection);
    }
  });

  return (
    <div className="space-y-4 text-gray-800">
      {/* Main description */}
      {mainContent.map((section, index) => (
        <div key={`main-${index}`} className="text-base">
          {section}
        </div>
      ))}
      
      {/* Source and Notes */}
      {sourceAndNotes.length > 0 && (
        <div className="mt-4 space-y-2">
          {sourceAndNotes.map((section, index) => (
            <div 
              key={`meta-${index}`} 
              className="text-sm text-gray-600"
            >
              {section}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MangaDescription;