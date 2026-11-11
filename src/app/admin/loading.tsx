import { Skeleton, TableSkeleton } from "@/components/ui/feedback";

export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-8">
      <Skeleton className="h-16 w-1/2 max-w-sm" />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>

      <TableSkeleton rows={6} cols={5} />
    </div>
  );
}

