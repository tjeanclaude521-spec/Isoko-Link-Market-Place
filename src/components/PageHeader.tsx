import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; to?: string }[];
  children?: ReactNode;
}

export function PageHeader({ title, subtitle, breadcrumbs, children }: PageHeaderProps) {
  return (
    <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-sm text-emerald-200 mb-4">
            {breadcrumbs.map((bc, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {bc.to ? (
                  <Link to={bc.to} className="hover:text-white transition-colors">{bc.label}</Link>
                ) : (
                  <span>{bc.label}</span>
                )}
                {i < breadcrumbs.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-emerald-400" />}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-3 text-lg text-emerald-100 max-w-2xl">{subtitle}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}
