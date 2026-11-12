import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  variant?: 'light' | 'dark';
}

export function PasswordInput({
  value,
  onChange,
  placeholder = '••••••••',
  required,
  autoComplete,
  variant = 'light',
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  const inputClass =
    variant === 'dark'
      ? 'w-full pl-10 pr-10 py-2.5 rounded-lg border border-stone-600 bg-stone-900 text-stone-100 text-sm focus:ring-2 focus:ring-stone-400 outline-none'
      : 'w-full pl-10 pr-10 py-2.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none';

  const lockColor = variant === 'dark' ? 'text-stone-500' : 'text-stone-400';
  const toggleColor = variant === 'dark' ? 'text-stone-500 hover:text-stone-300' : 'text-stone-400 hover:text-stone-600';

  return (
    <div className="relative">
      <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${lockColor}`} />
      <input
        required={required}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        className={inputClass}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className={`absolute right-3 top-1/2 -translate-y-1/2 ${toggleColor} transition-colors`}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
