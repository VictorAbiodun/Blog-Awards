import { NomineeGridSkeleton, Skeleton } from "@/components/ui/feedback";

export default function NomineesLoading() {
  return (
    <div>
      <div className="flex flex-col gap-4 px-5 pb-6 md:px-6 md:pb-8">
        <Skeleton className="h-14 w-full md:max-w-[560px]" />
        <div className="flex gap-2 overflow-x-auto pb-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-24 shrink-0 rounded" />
          ))}
        </div>
      </div>
      <NomineeGridSkeleton count={8} />
    </div>
  );
}

