import { ReactNode } from 'react';

interface LoadingProps {
  text?: string;
  fullScreen?: boolean;
}

export function Loading({ text = 'Loading...', fullScreen = false }: LoadingProps) {
  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="mt-3 text-sm text-stone-600">{text}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        <p className="mt-2 text-sm text-stone-600">{text}</p>
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-xl">!</div>
      <p className="mt-3 text-stone-700 max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, message, action }: { icon?: ReactNode; title: string; message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-stone-300 mb-3">{icon}</div>}
      <h3 className="text-lg font-semibold text-stone-700">{title}</h3>
      <p className="mt-1 text-sm text-stone-500 max-w-sm">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
