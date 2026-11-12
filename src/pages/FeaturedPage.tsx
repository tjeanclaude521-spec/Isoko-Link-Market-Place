import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { ProductCard } from '@/components/ProductCard';
import { PageHeader } from '@/components/PageHeader';
import { Loading, EmptyState } from '@/components/Feedback';
import { Star } from 'lucide-react';
import { isPromotionActive, formatRWF } from '@/lib/format';
import type { Product, Promotion } from '@/lib/types';

interface FeaturedItem {
  product: Product;
  promotion: Promotion;
}

export function FeaturedPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FeaturedItem[]>([]);

  useEffect(() => {
    (async () => {
      const { data: promos } = await supabase
        .from('promotions')
        .select(`
          *,
          product:products(
            *,
            category:categories(*)
          )
        `)
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false });

      const active: FeaturedItem[] = [];
      for (const p of promos || []) {
        if (isPromotionActive(p) && p.product) {
          active.push({ product: p.product as Product, promotion: p as Promotion });
        }
      }
      setItems(active);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <PageHeader
        title={t('featuredPageTitle')}
        subtitle={t('featuredSubtitle')}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200">
          <Star className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            {t('featuredInfo')}
          </p>
        </div>

        {loading ? (
          <Loading text={t('loadingFeatured')} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Star className="h-12 w-12" />}
            title={t('noFeaturedYet')}
            message={t('noFeaturedYetMsg')}
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {items.map(({ product, promotion }) => (
              <ProductCard key={product.id} product={product} promotion={promotion} />
            ))}
          </div>
        )}

        {/* Pricing info */}
        <div className="mt-12 p-6 rounded-xl bg-stone-50 border border-stone-200">
          <h3 className="text-lg font-bold text-stone-800 mb-3">{t('wantToFeature')}</h3>
          <p className="text-stone-600 mb-4">
            {t('wantToFeatureDesc', { price: formatRWF(1000) })}
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-stone-600">
            <div><span className="font-semibold text-stone-700">{t('featuredDuration')}</span> {t('featuredDurationValue')}</div>
            <div><span className="font-semibold text-stone-700">{t('featuredPlacement')}</span> {t('featuredPlacementValue')}</div>
            <div><span className="font-semibold text-stone-700">{t('featuredActivation')}</span> {t('featuredActivationValue')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
