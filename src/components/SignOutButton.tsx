import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

interface SignOutButtonProps {
  onSignedOut?: () => void;
}

export function SignOutButton({ onSignedOut }: SignOutButtonProps) {
  const { signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    onSignedOut?.();
  };

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/30 text-white text-sm font-medium hover:bg-white/10 transition-colors"
    >
      <LogOut className="h-4 w-4" />
      {t('logout')}
    </button>
  );
}
