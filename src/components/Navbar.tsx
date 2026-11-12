import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, LayoutDashboard, User, Globe, Sparkles } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { Logo } from './Logo';

export function Navbar() {
  const { t, lang, setLang } = useLanguage();
  const { user, profile } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { to: '/', label: t('home') },
    { to: '/browse', label: t('browse') },
    { to: '/sell', label: t('sell') },
    { to: '/featured', label: t('featuredProducts') },
    { to: '/about', label: t('about') },
    { to: '/contact', label: t('contact') },
  ];

  const assistantLink = { to: '/assistant', label: t('aiAssistantShort') };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-stone-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Logo />
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(link.to)
                      ? 'text-emerald-700 bg-emerald-50'
                      : 'text-stone-600 hover:text-emerald-700 hover:bg-stone-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to={assistantLink.to}
                className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(assistantLink.to)
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-stone-600 hover:text-emerald-700 hover:bg-stone-50'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                {assistantLink.label}
              </Link>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={() => setLang(lang === 'en' ? 'rw' : 'en')}
              className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium text-stone-600 hover:text-emerald-700 hover:bg-stone-50 transition-colors"
            >
              <Globe className="h-4 w-4" />
              {lang === 'en' ? 'KIN' : 'ENG'}
            </button>

            {user ? (
              <>
                <Link
                  to={profile?.role === 'admin' ? '/admin' : profile?.role === 'farmer' ? '/farmer' : '/buyer'}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-stone-600 hover:text-emerald-700 hover:bg-stone-50 transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {t('dashboard')}
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
                >
                  <User className="h-4 w-4" />
                  {t('login')}
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  {t('register')}
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-md text-stone-600 hover:bg-stone-100"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-stone-200 bg-white">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive(link.to)
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-stone-600 hover:text-emerald-700 hover:bg-stone-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to={assistantLink.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium ${
                isActive(assistantLink.to)
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-stone-600 hover:text-emerald-700 hover:bg-stone-50'
              }`}
            >
              <Sparkles className="h-5 w-5" />
              {assistantLink.label}
            </Link>
            <div className="pt-3 border-t border-stone-200">
              <button
                onClick={() => setLang(lang === 'en' ? 'rw' : 'en')}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-stone-600 hover:bg-stone-50 w-full"
              >
                <Globe className="h-5 w-5" />
                {lang === 'en' ? 'Kinyarwanda' : 'English'}
              </button>
              {user ? (
                <>
                  <Link
                    to={profile?.role === 'admin' ? '/admin' : profile?.role === 'farmer' ? '/farmer' : '/buyer'}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-stone-600 hover:bg-stone-50"
                  >
                    <LayoutDashboard className="h-5 w-5" />
                    {t('dashboard')}
                  </Link>
                </>
              ) : (
                <div className="flex gap-2 pt-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center px-3 py-2 rounded-md text-sm font-medium text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
                  >
                    {t('login')}
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center px-3 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    {t('register')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
