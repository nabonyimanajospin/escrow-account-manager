import React from 'react';

export const SkeletonRow = ({ columns = 4 }) => (
  <tr className="animate-pulse">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="py-4 pr-4">
        <div className="h-4 bg-slate-200 rounded w-full max-w-[120px]"></div>
      </td>
    ))}
  </tr>
);

export const SkeletonTable = ({ rows = 5, columns = 4 }) => (
  <div className="overflow-x-auto w-full">
    <table className="min-w-full">
      <thead>
        <tr className="border-b border-slate-100">
          {Array.from({ length: columns }).map((_, i) => (
            <th key={i} className="pb-3 pr-4 text-left">
              <div className="h-3 bg-slate-200 rounded w-16 mb-1"></div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonRow key={i} columns={columns} />
        ))}
      </tbody>
    </table>
  </div>
);

export const SkeletonCard = () => (
  <div className="card p-6 animate-pulse bg-white">
    <div className="h-3 bg-slate-200 rounded w-24 mb-4"></div>
    <div className="h-8 bg-slate-200 rounded w-32 mb-3"></div>
    <div className="h-3 bg-slate-200 rounded w-48"></div>
  </div>
);
