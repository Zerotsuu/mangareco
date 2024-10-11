import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '~/server/db';

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as { experience: string; favoriteGenres: string[] };
  const { experience, favoriteGenres } = body;

  try {
    const profile = await db.userProfile.create({
      data: {
        userId,
        experience,
        favoriteGenres,
      },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error creating user profile:', error);
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
  }
}