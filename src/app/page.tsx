import { getCarouselImages } from "@/lib/s3";
import Carousel from "@/components/Carousel";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const initialImages = await getCarouselImages();

  return (
    <main className="min-h-screen bg-black">
      <Carousel initialImages={initialImages} />
    </main>
  );
}
