import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Sprout, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-stone-900 text-stone-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <Sprout className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold text-white">Isoko Link</span>
            </div>
            <p className="text-sm leading-relaxed text-stone-400 max-w-md">
              {t('footerAbout')}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">{t('quickLinks')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-emerald-400 transition-colors">{t('home')}</Link></li>
              <li><Link to="/browse" className="hover:text-emerald-400 transition-colors">{t('browse')}</Link></li>
              <li><Link to="/featured" className="hover:text-emerald-400 transition-colors">{t('featuredLink')}</Link></li>
              <li><Link to="/about" className="hover:text-emerald-400 transition-colors">{t('about')}</Link></li>
              <li><Link to="/contact" className="hover:text-emerald-400 transition-colors">{t('contact')}</Link></li>
              <li className="pt-2 mt-2 border-t border-stone-800">
                <Link to="/admin/login" className="flex items-center gap-1.5 text-stone-500 hover:text-emerald-400 transition-colors text-xs">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t('adminLogin')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">{t('contactInfo')}</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-emerald-500 flex-shrink-0" />
                <span>Gisagara District, Southern Province, Rwanda</span>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="h-4 w-4 mt-0.5 text-emerald-500 flex-shrink-0" />
                <span>+250 783 286 211</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-0.5 text-emerald-500 flex-shrink-0" />
                <span>info@isokolink.rw</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-stone-800 text-center text-sm text-stone-500">
          <p>&copy; {new Date().getFullYear()} Isoko Link. {t('rights')}</p>
        </div>
      </div>
    </footer>
  );
}
