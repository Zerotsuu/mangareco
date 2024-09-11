import { ImageLoader } from 'next/image';

export const customImageLoader: ImageLoader = ({ src, width, quality }) => {
  // You can add more logic here to handle different image sources if needed
  return `${src}?w=${width}&q=${quality || 75}`;
};