import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return <div className={`animate-shimmer rounded-xl ${className}`} />;
};

export const ProjectCardSkeleton: React.FC = () => {
  return (
    <div className="glass-panel p-6 rounded-3xl border border-gray-800 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      <Skeleton className="h-12 w-full rounded-2xl" />

      <div className="space-y-2 pt-2">
        <div className="flex justify-between text-xs">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-800/60">
        <div className="flex -space-x-2">
          <Skeleton className="w-7 h-7 rounded-full" />
          <Skeleton className="w-7 h-7 rounded-full" />
          <Skeleton className="w-7 h-7 rounded-full" />
        </div>
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
    </div>
  );
};

export const KanbanBoardSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-w-[300px]">
      {[1, 2, 3, 4].map((col) => (
        <div key={col} className="glass-panel p-4 rounded-3xl border border-gray-800/80 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Skeleton className="w-3 h-3 rounded-full" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-5 w-7 rounded-full" />
          </div>

          <div className="space-y-3">
            {[1, 2].map((card) => (
              <div key={card} className="bg-gray-900/60 p-4 rounded-2xl border border-gray-800/50 space-y-3">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-16 rounded" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                </div>
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-3 w-full" />
                <div className="flex items-center justify-between pt-2 border-t border-gray-800/40">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="w-6 h-6 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export const StatCardSkeleton: React.FC = () => {
  return (
    <div className="glass-panel p-6 rounded-3xl border border-gray-800 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="w-10 h-10 rounded-2xl" />
      </div>
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
};
