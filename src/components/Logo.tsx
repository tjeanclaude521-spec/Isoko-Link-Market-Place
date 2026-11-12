import { Link } from 'react-router-dom';
import { Sprout } from 'lucide-react';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 font-bold ${className}`}>
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
        <Sprout className="h-5 w-5" />
      </div>
      <span className="text-lg text-emerald-700">Isoko<span className="text-stone-800"> Link</span></span>
    </Link>
  );
}
