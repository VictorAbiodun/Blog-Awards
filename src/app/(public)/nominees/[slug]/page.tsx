import { Suspense } from "react";

import { NomineeView } from "@/components/artists/nominee-view";
import { LoadingBlock } from "@/components/ui/feedback";

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
