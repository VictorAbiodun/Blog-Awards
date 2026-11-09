import type { Metadata } from "next";
import { Suspense } from "react";

import { ReceiptView } from "@/components/artists/receipt-view";
import { LoadingBlock } from "@/components/ui/feedback";

export const metadata: Metadata = { title: "Vote receipt" };

async function Receipt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReceiptView id={id} />;
}

// These pages render behind the login guard, so there is nothing to prefetch ahead of time.
export const instant = false;

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<LoadingBlock label="Loading your receipt" />}>
      <Receipt params={params} />
    </Suspense>
  );
}
