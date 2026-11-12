import { useLanguage } from '@/context/LanguageContext';
import { PageHeader } from '@/components/PageHeader';
import { Sprout, Target, MapPin, Users, TrendingUp, ShieldCheck } from 'lucide-react';
import { useDocumentMeta } from '@/lib/use-document-meta';

export function AboutPage() {
  const { t } = useLanguage();

  useDocumentMeta({
    title: 'About Isoko Link — Agricultural Marketplace for Gisagara District',
    description: t('metaAboutDesc'),
    canonicalPath: '/about',
  });

  return (
    <div>
      <PageHeader title={t('aboutTitle')} subtitle={t('aboutSubtitle')} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Mission */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Target className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-bold text-stone-800">{t('ourMission')}</h2>
          </div>
          <p className="text-stone-600 leading-relaxed text-lg">
            {t('ourMissionDesc')}
          </p>
        </section>

        {/* What we do */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-stone-800 mb-6">{t('whatWeDo')}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl border border-stone-200 hover:shadow-md transition-shadow">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 mb-4">
                <Sprout className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-stone-800 mb-2">{t('freeListings')}</h3>
              <p className="text-sm text-stone-600">{t('freeListingsDesc')}</p>
            </div>
            <div className="p-6 rounded-xl border border-stone-200 hover:shadow-md transition-shadow">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 mb-4">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-stone-800 mb-2">{t('featuredPromotionsAbout')}</h3>
              <p className="text-sm text-stone-600">{t('featuredPromotionsAboutDesc')}</p>
            </div>
            <div className="p-6 rounded-xl border border-stone-200 hover:shadow-md transition-shadow">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 mb-4">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-stone-800 mb-2">{t('directContact')}</h3>
              <p className="text-sm text-stone-600">{t('directContactDesc')}</p>
            </div>
            <div className="p-6 rounded-xl border border-stone-200 hover:shadow-md transition-shadow">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-700 mb-4">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-stone-800 mb-2">{t('transparentCommission')}</h3>
              <p className="text-sm text-stone-600">{t('transparentCommissionDesc')}</p>
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-700">
              <MapPin className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-bold text-stone-800">{t('ourLocation')}</h2>
          </div>
          <p className="text-stone-600 leading-relaxed">
            {t('ourLocationDesc')}
          </p>
        </section>

        {/* Revenue model */}
        <section className="p-8 rounded-xl bg-emerald-50 border border-emerald-200">
          <h2 className="text-2xl font-bold text-stone-800 mb-4">{t('howSustains')}</h2>
          <p className="text-stone-600 leading-relaxed mb-4">
            {t('howSustainsDesc')}
          </p>
          <ol className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">1</span>
              <p className="text-stone-600"><span className="font-semibold text-stone-700">{t('howSustains1')}</span></p>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">2</span>
              <p className="text-stone-600"><span className="font-semibold text-stone-700">{t('howSustains2')}</span></p>
            </li>
          </ol>
        </section>
      </div>
    </div>
  );
}
