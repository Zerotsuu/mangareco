// app/page.tsx
import { MangaTabs } from '~/app/_components/MangaTabs';

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <MangaTabs />
    </main>
  );
}

export const dynamic = 'force-dynamic';