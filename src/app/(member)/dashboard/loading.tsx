import { Skeleton } from "@/components/ui/feedback";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8 px-5 pb-24 pt-6 md:px-6 md:pb-32">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-16 w-3/4 max-w-lg md:h-24" />
        <Skeleton className="h-6 w-1/2 max-w-sm" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>

      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}

