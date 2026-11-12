import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Lang } from '@/lib/translations';
import { translations, TranslationKey } from '@/lib/translations';

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('isoko_lang');
    return saved === 'rw' ? 'rw' : 'en';
  });

  useEffect(() => {
    localStorage.setItem('isoko_lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (newLang: Lang) => setLangState(newLang);

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    let text: string = translations[lang][key] || translations.en[key] || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
