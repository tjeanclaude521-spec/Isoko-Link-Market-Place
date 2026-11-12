import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'emerald' | 'blue' | 'amber' | 'teal' | 'red' | 'stone';
  hint?: string;
}

const colorMap = {
  emerald: 'bg-emerald-100 text-emerald-700',
  blue: 'bg-blue-100 text-blue-700',
  amber: 'bg-amber-100 text-amber-700',
  teal: 'bg-teal-100 text-teal-700',
  red: 'bg-red-100 text-red-700',
  stone: 'bg-stone-100 text-stone-700',
};

export function StatCard({ label, value, icon: Icon, color = 'emerald', hint }: StatCardProps) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="text-2xl font-bold text-stone-800">{value}</div>
      <div className="text-sm text-stone-500 mt-1">{label}</div>
      {hint && <div className="text-xs text-stone-400 mt-1">{hint}</div>}
    </div>
  );
}
