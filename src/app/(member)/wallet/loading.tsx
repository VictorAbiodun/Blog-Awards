import { Skeleton, TableSkeleton } from "@/components/ui/feedback";

export default function WalletLoading() {
  return (
    <div className="flex flex-col gap-10 px-5 pb-24 pt-6 md:px-6 md:pb-32">
      <Skeleton className="h-20 w-3/4 max-w-md md:h-28" />

      <div className="grid gap-8 lg:grid-cols-2">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>

      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-56" />
        <TableSkeleton rows={4} cols={4} />
      </div>
    </div>
  );
}

