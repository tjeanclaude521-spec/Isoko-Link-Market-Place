import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { PageHeader } from '@/components/PageHeader';
import { Loading, ErrorState } from '@/components/Feedback';
import { ProductCard } from '@/components/ProductCard';
import { Phone, MessageCircle, MapPin, BadgeCheck, Calendar, ChevronLeft, Package, Sprout } from 'lucide-react';
import { formatDate } from '@/lib/format';
import type { SellerProfile, Product } from '@/lib/types';

export function SellerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    (async () => {
      if (!id) return;

      const { data: sellerData, error: sellerErr } = await supabase
        .from('seller_profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (sellerErr || !sellerData) {
        setError('Seller not found.');
        setLoading(false);
        return;
      }

      setSeller(sellerData as SellerProfile);

      const { data: prodData } = await supabase
        .from('products')
        .select(`*, category:categories(*)`)
        .eq('farmer_id', id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      setProducts((prodData || []) as Product[]);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <Loading fullScreen text="Loading seller profile..." />;
  if (error || !seller) {
    return (
      <div>
        <PageHeader title="Seller Not Found" />
        <ErrorState message={error || 'This seller profile is not available.'} onRetry={() => navigate('/browse')} />
      </div>
    );
  }

  const whatsappLink = seller.whatsapp ? `https://wa.me/${seller.whatsapp.replace(/[^0-9]/g, '')}` : `https://wa.me/${seller.phone.replace(/[^0-9]/g, '')}`;

  return (
    <div>
      <PageHeader
        title={seller.full_name}
        breadcrumbs={[
          { label: t('home'), to: '/' },
          { label: t('browse'), to: '/browse' },
          { label: t('sellerProfile') },
        ]}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/browse" className="flex items-center gap-1 text-sm text-stone-600 hover:text-emerald-700 mb-6">
          <ChevronLeft className="h-4 w-4" />
          {t('browse')}
        </Link>

        {/* Seller header card */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden mb-8">
          <div className="flex flex-col sm:flex-row gap-6 p-6">
            {/* Profile photo */}
            <div className="flex-shrink-0">
              <div className="h-28 w-28 rounded-full overflow-hidden bg-emerald-100 flex items-center justify-center border-4 border-emerald-50">
                {seller.profile_photo_url ? (
                  <img src={seller.profile_photo_url} alt={seller.full_name} className="w-full h-full object-cover" />
                ) : (
                  <Sprout className="h-12 w-12 text-emerald-400" />
                )}
              </div>
            </div>

            {/* Seller info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold text-stone-800">{seller.full_name}</h1>
                {seller.verified && (
                  <BadgeCheck className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-stone-600 mb-3">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-stone-400" />
                  {seller.sector ? `${seller.sector}, ` : ''}{seller.district}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-stone-400" />
                  {t('memberSince')} {formatDate(seller.created_at)}
                </span>
              </div>

              {seller.business_description && (
                <p className="text-stone-600 leading-relaxed mb-4">{seller.business_description}
                </p>
              )}

              {/* Contact buttons */}
              <div className="flex flex-wrap gap-3">
                {seller.phone && (
                  <a
                    href={`tel:${seller.phone}`}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
                  >
                    <Phone className="h-5 w-5" />
                    {t('callSeller')}
                  </a>
                )}
                {(seller.whatsapp || seller.phone) && (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
                  >
                    <MessageCircle className="h-5 w-5" />
                    {t('whatsappSeller')}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Active products */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Package className="h-5 w-5 text-emerald-600" />
            <h2 className="text-xl font-bold text-stone-800">{t('activeProducts')} ({products.length})</h2>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-12 rounded-xl bg-stone-50 border border-stone-200">
              <p className="text-stone-500">{t('noActiveProducts')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
