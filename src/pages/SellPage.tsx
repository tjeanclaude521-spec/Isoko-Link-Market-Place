import { Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { TrendingUp, CheckCircle, ArrowRight, Package, DollarSign, AlertCircle } from 'lucide-react';
import { formatRWF } from '@/lib/format';
import { useDocumentMeta } from '@/lib/use-document-meta';

function isValidRwandaPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s-]/g, '');
  return /^(\+250[0-9]{9}|0[0-9]{9})$/.test(cleaned);
}

export function SellPage() {
  const { t } = useLanguage();
  const { user, profile } = useAuth();

  useDocumentMeta({
    title: 'Sell on Isoko Link — Agricultural Marketplace for Gisagara District',
    description: t('metaSellDesc'),
    canonicalPath: '/sell',
  });

  const benefits = [
    { icon: CheckCircle, text: t('benefit1') },
    { icon: CheckCircle, text: t('benefit2') },
    { icon: CheckCircle, text: t('benefit3') },
    { icon: CheckCircle, text: t('benefit4') },
    { icon: CheckCircle, text: t('benefit5') },
    { icon: CheckCircle, text: t('benefit6') },
  ];

  const steps = [
    { icon: 1, title: t('step1SellTitle'), desc: t('step1SellDesc') },
    { icon: 2, title: t('step2SellTitle'), desc: t('step2SellDesc') },
    { icon: 3, title: t('step3SellTitle'), desc: t('step3SellDesc') },
    { icon: 4, title: t('step4SellTitle'), desc: t('step4SellDesc') },
  ];

  return (
    <div>
      <PageHeader
        title={t('sellYourProducts')}
        subtitle={t('sellSubtitle')}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* CTA banner */}
        {!user && (
          <div className="mb-10 p-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-center">
            <h2 className="text-xl font-bold mb-2">{t('readyToSell')}</h2>
            <p className="text-emerald-50 mb-4">{t('readyToSellDesc')}</p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors"
            >
              {t('createAccount')}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        )}

        {user && profile?.role === 'farmer' && (
          <>
            {(!profile.phone || !isValidRwandaPhone(profile.phone)) ? (
              <div className="mb-10 p-6 rounded-xl border border-amber-300 bg-amber-50 flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-lg font-bold text-amber-800 mb-2">{t('completeProfile')}</h2>
                  <p className="text-amber-700 text-sm mb-4">{t('completeProfileMsg')}</p>
                  <Link
                    to="/farmer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-colors"
                  >
                    {t('completeProfile')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-10 p-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-center">
                  <h2 className="text-xl font-bold mb-2">{t('welcomeBack', { name: profile.full_name })}</h2>
                  <p className="text-emerald-50 mb-4">{t('welcomeBackDesc')}</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Link
                      to="/farmer"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors"
                    >
                      {t('goToDashboard')}
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </div>
                </div>

                <div className="mb-10 p-6 rounded-xl border-2 border-amber-300 bg-amber-50">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-white flex-shrink-0">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-amber-900 mb-1">{t('featureYourProducts')}</h2>
                      <p className="text-amber-800 text-sm mb-4">{t('featureDesc', { price: formatRWF(1000) })}</p>
                      <Link
                        to="/farmer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors"
                      >
                        {t('promoteProduct')}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Benefits */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-stone-800 mb-6">{t('whySellTitle')}</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-lg border border-stone-200 bg-white">
                <b.icon className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-stone-700">{b.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Steps */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-stone-800 mb-6">{t('howItWorksTitle')}</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((step) => (
              <div key={step.icon} className="text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white text-lg font-bold mb-3">
                  {step.icon}
                </div>
                <h3 className="font-semibold text-stone-800 mb-1">{step.title}</h3>
                <p className="text-sm text-stone-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="p-8 rounded-xl bg-stone-50 border border-stone-200">
          <h2 className="text-2xl font-bold text-stone-800 mb-6 text-center">{t('pricingTitle')}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-white border border-stone-200">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 mb-3">
                <Package className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-stone-800 mb-1">{t('basicListing')}</h3>
              <div className="text-2xl font-bold text-emerald-700 mb-2">{t('basicListingFree')}</div>
              <p className="text-sm text-stone-600">{t('basicListingDesc')}</p>
            </div>
            <div className="p-6 rounded-xl bg-white border-2 border-amber-300 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-500 text-white text-xs font-semibold">
                {t('optional')}
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 mb-3">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-stone-800 mb-1">{t('featuredPromotion')}</h3>
              <div className="text-2xl font-bold text-amber-600 mb-2">{t('featuredPromotionPrice', { price: formatRWF(1000) })}</div>
              <p className="text-sm text-stone-600">{t('featuredPromotionDesc')}</p>
            </div>
            <div className="p-6 rounded-xl bg-white border border-stone-200">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-700 mb-3">
                <DollarSign className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-stone-800 mb-1">{t('salesCommission')}</h3>
              <div className="text-2xl font-bold text-teal-600 mb-2">{t('salesCommissionRate')}</div>
              <p className="text-sm text-stone-600">{t('salesCommissionDesc')}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
