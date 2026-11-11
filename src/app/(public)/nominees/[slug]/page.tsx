import type { Metadata } from "next";
import { Suspense } from "react";

import { NomineeView } from "@/components/artists/nominee-view";
import { LoadingBlock } from "@/components/ui/feedback";
import { api } from "@/services";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const artist = await api.getArtist(slug);
    if (!artist) return { title: "Nominee Not Found" };
    return {
      title: `${artist.name} | Nominee`,
      description: artist.bio || `Vote for ${artist.name} in Blog Award 2.0.`,
      openGraph: {
        title: `${artist.name} - Blog Award 2.0 Nominee`,
        description: artist.bio || `Vote for ${artist.name} in Blog Award 2.0.`,
        images: artist.imageUrl ? [{ url: artist.imageUrl }] : [],
      },
      twitter: {
        card: "summary_large_image",
        title: `${artist.name} - Blog Award 2.0 Nominee`,
        description: artist.bio || `Vote for ${artist.name} in Blog Award 2.0.`,
        images: artist.imageUrl ? [artist.imageUrl] : [],
      },
    };
  } catch {
    return { title: "Nominee Details" };
  }
}

async function Nominee({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <NomineeView slug={slug} />;
}

export default function NomineePage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <main id="main">
      <Suspense fallback={<LoadingBlock label="Loading nominee" />}>
        <Nominee params={params} />
      </Suspense>
    </main>
  );
}
