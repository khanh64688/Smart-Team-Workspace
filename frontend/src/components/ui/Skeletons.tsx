import React from 'react';

export const KanbanSkeleton: React.FC = () => {
  return (
    <div className="flex gap-6 overflow-x-auto pb-6 animate-pulse">
      {[1, 2, 3, 4].map((col) => (
        <div key={col} className="w-80 shrink-0 bg-gray-900/60 rounded-3xl p-4 border border-gray-800/60">
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 w-24 bg-gray-800 rounded-lg"></div>
            <div className="h-5 w-6 bg-gray-800 rounded-full"></div>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((card) => (
              <div key={card} className="h-32 bg-gray-800/50 rounded-2xl p-4 border border-gray-800/40 flex flex-col justify-between">
                <div className="h-4 w-3/4 bg-gray-700/60 rounded"></div>
                <div className="h-3 w-1/2 bg-gray-800 rounded mt-2"></div>
                <div className="flex justify-between items-center mt-4">
                  <div className="h-6 w-16 bg-gray-800 rounded-lg"></div>
                  <div className="w-6 h-6 rounded-full bg-gray-800"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((card) => (
          <div key={card} className="glass-panel p-5 rounded-3xl border border-gray-800/60 flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-3 w-20 bg-gray-800 rounded"></div>
              <div className="h-8 w-12 bg-gray-800 rounded-lg"></div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gray-800"></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-3xl border border-gray-800/60 h-72 flex flex-col justify-between">
          <div className="h-4 w-36 bg-gray-800 rounded"></div>
          <div className="w-40 h-40 rounded-full bg-gray-800/60 mx-auto my-auto"></div>
        </div>
        <div className="glass-panel p-6 rounded-3xl border border-gray-800/60 h-72 flex flex-col justify-between">
          <div className="h-4 w-36 bg-gray-800 rounded"></div>
          <div className="w-full h-48 bg-gray-800/60 rounded-xl mt-4"></div>
        </div>
      </div>
    </div>
  );
};

export const ProjectsSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
      {[1, 2, 3].map((item) => (
        <div key={item} className="glass-panel p-6 rounded-3xl border border-gray-800/60 h-56 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex justify-between">
              <div className="h-4 w-16 bg-gray-800 rounded-full"></div>
              <div className="h-4 w-20 bg-gray-800 rounded"></div>
            </div>
            <div className="h-6 w-3/4 bg-gray-800 rounded-lg"></div>
            <div className="h-4 w-full bg-gray-800/60 rounded"></div>
          </div>
          <div className="pt-4 border-t border-gray-800/60 flex justify-between items-center">
            <div className="flex -space-x-2">
              <div className="w-7 h-7 rounded-full bg-gray-800"></div>
              <div className="w-7 h-7 rounded-full bg-gray-800"></div>
            </div>
            <div className="h-7 w-24 bg-gray-800 rounded-xl"></div>
          </div>
        </div>
      ))}
    </div>
  );
};
