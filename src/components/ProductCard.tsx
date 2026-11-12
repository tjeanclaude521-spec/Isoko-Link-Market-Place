import { Link } from 'react-router-dom';
import { MapPin, BadgeCheck, Star, Sprout } from 'lucide-react';
import type { Product } from '@/lib/types';
import { formatRWF } from '@/lib/format';
import { useLanguage } from '@/context/LanguageContext';
import { isPromotionActive } from '@/lib/format';

interface ProductCardProps {
  product: Product;
  promotion?: { start_date: string | null; end_date: string | null; payment_status: string } | null;
}

export function ProductCard({ product, promotion }: ProductCardProps) {
  const { t, lang } = useLanguage();
  const featured = promotion ? isPromotionActive(promotion) : false;
  const categoryName = product.category
    ? (lang === 'rw' ? product.category.name_rw : product.category.name_en)
    : '';

  return (
    <Link
      to={`/product/${product.id}`}
      className="group block rounded-xl overflow-hidden bg-white border border-stone-200 hover:border-emerald-300 hover:shadow-lg transition-all duration-200"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-300">
            <Sprout className="h-12 w-12" aria-hidden="true" />
          </div>
        )}
        {featured && (
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-white text-xs font-semibold shadow-md">
            <Star className="h-3 w-3 fill-white" />
            {t('featured')}
          </div>
        )}
        {product.status === 'paused' && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-stone-500 text-white text-xs font-semibold">
            {t('paused')}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-stone-800 group-hover:text-emerald-700 transition-colors line-clamp-1">
            {product.name}
          </h3>
        </div>
        {categoryName && (
          <p className="text-xs text-stone-500 mb-2">{categoryName}</p>
        )}
        <div className="flex items-baseline gap-1 mb-3">
          <span className="text-lg font-bold text-emerald-700">{formatRWF(product.price)}</span>
          <span className="text-sm text-stone-500">/ {product.unit}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-stone-600">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-stone-400" />
            <span className="line-clamp-1">{product.sector || product.district}</span>
          </span>
          <span className="text-xs text-stone-500">
            {product.quantity_available} {product.unit}
          </span>
        </div>
        {product.farmer?.verified && (
          <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
            <BadgeCheck className="h-3.5 w-3.5" />
            {t('verifiedFarmer')}
          </div>
        )}
      </div>
    </Link>
  );
}
