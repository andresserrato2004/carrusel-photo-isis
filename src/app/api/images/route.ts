import { NextResponse } from 'next/server';
import { getCarouselImages } from '@/lib/s3';

export const dynamic = 'force-dynamic'; // Ensure this route is not cached

export async function GET() {
  try {
    const images = await getCarouselImages();
    return NextResponse.json(images);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
  }
}
