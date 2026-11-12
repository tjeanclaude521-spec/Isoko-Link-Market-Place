import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { Loading, ErrorState } from '@/components/Feedback';
import { formatRWF, formatDate, isPromotionActive } from '@/lib/format';
import { useDocumentMeta, ensureMetaTag, ensureOGTag, useJsonLd, SITE_ORIGIN } from '@/lib/use-document-meta';
import { Phone, MessageCircle, MapPin, Package, Calendar, User, Star, BadgeCheck, ShoppingBag, ChevronLeft, ArrowRight, Sparkles, X, Bot } from 'lucide-react';
import type { Product, Promotion } from '@/lib/types';
import { AIAssistant } from '@/components/AIAssistant';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { user, profile } = useAuth();

  useDocumentMeta({
    title: undefined,
    description: undefined,
    canonicalPath: id ? `/product/${id}` : undefined,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [showEnquiryForm, setShowEnquiryForm] = useState(false);
  const [enquiryName, setEnquiryName] = useState('');
  const [enquiryPhone, setEnquiryPhone] = useState('');
  const [enquiryWhatsapp, setEnquiryWhatsapp] = useState('');
  const [enquiryMessage, setEnquiryMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [enquiryRef, setEnquiryRef] = useState('');
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  useEffect(() => {
    if (!product) return;
    const catName = product.category
      ? (lang === 'rw' ? product.category.name_rw : product.category.name_en)
      : '';
    const location = product.sector ? `${product.sector}, ${product.district}` : product.district;
    const desc = product.description
      ? `${product.description} — ${formatRWF(product.price)} / ${product.unit}${catName ? `, ${catName}` : ''}${location ? `, ${location}` : ''}.`
      : `${product.name} — ${formatRWF(product.price)} / ${product.unit}${catName ? `, ${catName}` : ''}${location ? `, ${location}` : ''}.`;
    const title = `${product.name} — Isoko Link`;
    ensureMetaTag('description', desc);
    ensureOGTag('og:description', desc);
    ensureOGTag('og:title', title);
    document.title = title;
  }, [product, lang]);

  const productJsonLd = product ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || `${product.name} — ${formatRWF(product.price)} / ${product.unit}`,
    image: product.image_url ? [product.image_url] : undefined,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'RWF',
      availability: product.quantity_available > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${SITE_ORIGIN}/product/${product.id}`,
    },
    category: product.category ? (lang === 'rw' ? product.category.name_rw : product.category.name_en) : undefined,
    areaServed: 'Gisagara District, Rwanda',
    url: `${SITE_ORIGIN}/product/${product.id}`,
  } : null;
  useJsonLd(productJsonLd || {});

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data, error: err } = await supabase
        .from('products')
        .select(`*, category:categories(*), farmer:profiles!products_farmer_id_fkey(*)`)
        .eq('id', id)
        .maybeSingle();

      if (err || !data) {
        setError(t('productNotFoundError'));
        setLoading(false);
        return;
      }

      setProduct(data as Product);

      const { data: promos } = await supabase
        .from('promotions')
        .select('*')
        .eq('product_id', id)
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false });

      if (promos && promos.length > 0) {
        for (const p of promos) {
          if (isPromotionActive(p)) {
            setPromotion(p as Promotion);
            break;
          }
        }
      }

      if (profile) {
        setEnquiryName(profile.full_name);
        setEnquiryPhone(profile.phone);
        setEnquiryWhatsapp(profile.whatsapp);
      }

      setLoading(false);
    })();
  }, [id, profile]);

  const handleEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !user) return;
    setSubmitting(true);

    const ref = `ENQ-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;

    const { error: insertError } = await supabase.from('enquiries').insert({
      reference: ref,
      product_id: product.id,
      farmer_id: product.farmer_id,
      buyer_id: user.id,
      buyer_name: enquiryName,
      buyer_phone: enquiryPhone,
      buyer_whatsapp: enquiryWhatsapp,
      message: enquiryMessage,
      status: 'new',
    });

    setSubmitting(false);

    if (insertError) {
      setError(t('enquiryFailed'));
      return;
    }

    setEnquiryRef(ref);
    setShowEnquiryForm(false);
  };

  if (loading) return <Loading fullScreen />;
  if (error || !product) {
    return (
      <div>
        <PageHeader title={t('productNotFound')} />
        <ErrorState message={error || t('productNotFoundMsg')} onRetry={() => navigate('/browse')} />
      </div>
    );
  }

  const featured = promotion ? isPromotionActive(promotion) : false;
  const farmerName = product.farmer?.full_name || 'Farmer';
  const phone = product.contact_phone || product.farmer?.phone || '';
  const whatsapp = product.contact_whatsapp || product.farmer?.whatsapp || '';
  const whatsappLink = whatsapp ? `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}` : '';
  const categoryName = product.category
    ? (lang === 'rw' ? product.category.name_rw : product.category.name_en)
    : '';

  return (
    <div>
      <PageHeader
        title={product.name}
        breadcrumbs={[
          { label: t('home'), to: '/' },
          { label: t('browse'), to: '/browse' },
          { label: product.name },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/browse" className="flex items-center gap-1 text-sm text-stone-600 hover:text-emerald-700 mb-6">
          <ChevronLeft className="h-4 w-4" />
          {t('backToBrowse')}
        </Link>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Image */}
          <div className="rounded-xl overflow-hidden bg-stone-100 border border-stone-200">
            <div className="relative aspect-[4/3]">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-300">
                  <Package className="h-20 w-20" />
                </div>
              )}
              {featured && (
                <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500 text-white text-sm font-semibold shadow-md">
                  <Star className="h-4 w-4 fill-white" />
                  {t('featured')}
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div>
            {categoryName && (
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium mb-3">
                {categoryName}
              </span>
            )}
            <h2 className="text-2xl font-bold text-stone-800 mb-4">{product.name}</h2>

            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-3xl font-bold text-emerald-700">{formatRWF(product.price)}</span>
              <span className="text-lg text-stone-500">/ {product.unit}</span>
            </div>

            {product.description && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-stone-700 mb-2">{t('description')}</h3>
                <p className="text-stone-600 leading-relaxed">{product.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6 p-4 rounded-lg bg-stone-50 border border-stone-100">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-stone-400" />
                <div>
                  <p className="text-xs text-stone-500">{t('quantity')}</p>
                  <p className="text-sm font-medium text-stone-700">{product.quantity_available} {product.unit}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-stone-400" />
                <div>
                  <p className="text-xs text-stone-500">{t('location')}</p>
                  <p className="text-sm font-medium text-stone-700">{product.sector ? `${product.sector}, ` : ''}{product.district}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {product.farmer?.profile_photo_url ? (
                  <img src={product.farmer.profile_photo_url} alt={farmerName} className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <User className="h-4 w-4 text-stone-400" />
                )}
                <div>
                  <p className="text-xs text-stone-500">{t('seller')}</p>
                  <Link to={`/seller/${product.farmer_id}`} className="text-sm font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1">
                    {farmerName}
                    {product.farmer?.verified && <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-stone-400" />
                <div>
                  <p className="text-xs text-stone-500">{t('listedOn')}</p>
                  <p className="text-sm font-medium text-stone-700">{formatDate(product.created_at)}</p>
                </div>
              </div>
            </div>

            {product.farmer?.business_description && (
              <div className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                <p className="text-sm text-stone-600 leading-relaxed">{product.farmer.business_description}</p>
                <Link to={`/seller/${product.farmer_id}`} className="text-xs text-emerald-700 font-medium hover:text-emerald-800 mt-2 inline-block">
                  {t('viewSellerProfile')} →
                </Link>
              </div>
            )}

            {/* AI Explain button */}
            <div className="mb-6">
              <button
                onClick={() => setShowAIAssistant(true)}
                className="flex items-center gap-2 px-5 py-3 rounded-lg bg-stone-800 text-white font-medium hover:bg-stone-900 transition-colors w-full sm:w-auto"
              >
                <Sparkles className="h-5 w-5" />
                {t('aiExplainProduct')}
              </button>
            </div>

            {/* Contact buttons */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-stone-700">{t('contactFarmer')}</h3>
              <div className="flex flex-wrap gap-3">
                {phone && (
                  <a
                    href={`tel:${phone}`}
                    className="flex items-center gap-2 px-5 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
                  >
                    <Phone className="h-5 w-5" />
                    {t('callNow')}
                  </a>
                )}
                {whatsappLink && (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-3 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
                  >
                    <MessageCircle className="h-5 w-5" />
                    {t('whatsapp')}
                  </a>
                )}
                {user && user.id !== product.farmer_id && (
                  <button
                    onClick={() => setShowEnquiryForm(true)}
                    className="flex items-center gap-2 px-5 py-3 rounded-lg border border-emerald-300 text-emerald-700 font-medium hover:bg-emerald-50 transition-colors"
                  >
                    <ShoppingBag className="h-5 w-5" />
                    {t('sendEnquiry')}
                  </button>
                )}
                {!user && (
                  <Link
                    to="/login"
                    className="flex items-center gap-2 px-5 py-3 rounded-lg border border-emerald-300 text-emerald-700 font-medium hover:bg-emerald-50 transition-colors"
                  >
                    <ShoppingBag className="h-5 w-5" />
                    {t('signInToEnquire')}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Assistant modal */}
      {showAIAssistant && product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowAIAssistant(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-stone-200 sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                <Bot className="h-5 w-5 text-emerald-600" />
                {t('aiProductExplanation')}: {product.name}
              </h3>
              <button onClick={() => setShowAIAssistant(false)} className="p-1 rounded-lg text-stone-400 hover:bg-stone-100 text-xl leading-none flex items-center justify-center w-8 h-8">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5">
              <AIAssistant
                productContext={{
                  name: product.name,
                  description: product.description,
                  price: Number(product.price),
                  unit: product.unit,
                }}
                compact
              />
            </div>
          </div>
        </div>
      )}

      {/* Enquiry modal */}
      {showEnquiryForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowEnquiryForm(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-stone-800 mb-1">{t('sendEnquiry')}</h3>
            <p className="text-sm text-stone-500 mb-4">Send a message to {farmerName} about {product.name}.</p>
            <form onSubmit={handleEnquiry} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">{t('fullName')}</label>
                <input
                  required
                  value={enquiryName}
                  onChange={(e) => setEnquiryName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">{t('phone')}</label>
                <input
                  required
                  value={enquiryPhone}
                  onChange={(e) => setEnquiryPhone(e.target.value)}
                  placeholder="+250..."
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">{t('whatsappNumber')}</label>
                <input
                  value={enquiryWhatsapp}
                  onChange={(e) => setEnquiryWhatsapp(e.target.value)}
                  placeholder="+250..."
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">{t('message')}</label>
                <textarea
                  value={enquiryMessage}
                  onChange={(e) => setEnquiryMessage(e.target.value)}
                  rows={3}
                  placeholder="I'm interested in your product..."
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEnquiryForm(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-stone-300 text-stone-700 font-medium hover:bg-stone-50 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? t('sending') : t('sendEnquiryBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enquiry success modal */}
      {enquiryRef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
              <BadgeCheck className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-stone-800 mb-2">{t('enquirySent')}</h3>
            <p className="text-stone-600 mb-3">{t('enquirySentMsg')}</p>
            <div className="inline-block px-4 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono font-bold text-lg mb-4">
              {enquiryRef}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setEnquiryRef(''); navigate('/browse'); }}
                className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
              >
                {t('continueBrowsing')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
