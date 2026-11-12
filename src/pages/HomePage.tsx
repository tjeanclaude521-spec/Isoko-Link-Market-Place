import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';

import { ProductCard } from '@/components/ProductCard';
import { Loading } from '@/components/Feedback';
import { formatRWF, isPromotionActive } from '@/lib/format';
import * as Icons from 'lucide-react';
import {
  Sprout, Search, TrendingUp, ShieldCheck, Users, ArrowRight, Star,
  Wheat, Bean, Salad, Apple, Carrot, Coffee, Package, Sparkles, Quote,
} from 'lucide-react';
import type { Product, Promotion, Category, Testimonial } from '@/lib/types';
import { useDocumentMeta } from '@/lib/use-document-meta';
import heroImage from '@/Harvest_Smiles_in_Rwanda’s_Highlands.png';

const categoryIconMap: Record<string, Icons.LucideIcon> = {
  Wheat, Bean, Salad, Apple, Carrot, Coffee, Package,
};

export function HomePage() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  useDocumentMeta({
    title: 'Isoko Link — Agricultural Marketplace for Gisagara District, Rwanda',
    description: t('metaHomeDesc'),
    canonicalPath: '/',
  });

  const [loading, setLoading] = useState(true);
  const [featuredProducts, setFeaturedProducts] = useState<{ product: Product; promotion: Promotion }[]>([]);
  const [latestProducts, setLatestProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState({ products: 0, farmers: 0 });
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    (async () => {
      const { data: cats } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order');
      setCategories((cats || []) as Category[]);

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

      const activeFeatured: { product: Product; promotion: Promotion }[] = [];
      for (const p of promos || []) {
        if (isPromotionActive(p) && p.product) {
          activeFeatured.push({ product: p.product as Product, promotion: p as Promotion });
        }
      }
      setFeaturedProducts(activeFeatured.slice(0, 8));

      const { data: latest } = await supabase
        .from('products')
        .select(`*, category:categories(*)`)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(8);
      setLatestProducts((latest || []) as Product[]);

      const [{ count: productCount }, { count: farmerCount }] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'farmer'),
      ]);
      setStats({ products: productCount || 0, farmers: farmerCount || 0 });

      const { data: testims } = await supabase
        .from('testimonials')
        .select('*')
        .eq('is_published', true)
        .order('sort_order', { ascending: true })
        .limit(6);
      setTestimonials((testims || []) as Testimonial[]);

      setLoading(false);
    })();
  }, []);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/browse');
    }
  }, [searchQuery, navigate]);

  if (loading) return <Loading fullScreen text={lang === 'rw' ? 'Isoko irakiza...' : 'Loading marketplace...'} />;

  const quickLinks = [
    { icon: Search, label: t('browseProducts'), desc: t('quickLinkBrowseDesc'), to: '/browse' },
    { icon: Sprout, label: t('sellProducts'), desc: t('quickLinkSellDesc'), to: '/sell' },
    { icon: Star, label: t('featuredProducts'), desc: t('quickLinkFeaturedDesc'), to: '/featured' },
    { icon: Sparkles, label: t('aiAssistant'), desc: t('quickLinkAssistantDesc'), to: '/assistant' },
  ];

  const hasProducts = stats.products > 0;
  const hasFarmers = stats.farmers > 0;

  return (
    <div>
      {/* Full-width agricultural hero */}
      <section
        className="relative overflow-hidden bg-emerald-950 bg-cover bg-center text-white sm:bg-[position:center_45%] lg:bg-[position:center_35%]"
        style={{
          backgroundImage: `url("${heroImage}")`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/92 via-emerald-950/70 to-emerald-950/20" />
        <div className="absolute inset-0 bg-emerald-950/10" />

        <div className="relative mx-auto w-full px-4 py-16 sm:px-6 md:py-20 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-emerald-300/30 text-emerald-50 text-sm font-medium mb-6">
                <Sprout className="h-4 w-4" />
                {t('heroLocationBadge')}
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-bold leading-[1.15] tracking-tight">
                {t('heroHeadline')}
              </h1>

              <p className="mt-5 text-base sm:text-lg md:text-xl text-emerald-50/90 leading-relaxed">
                {t('heroSupportingText')}
              </p>

              {/* Search bar */}
              <form onSubmit={handleSearch} className="mt-7 flex gap-2 max-w-xl">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
                  <input
                    type="text"
                    placeholder={t('searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label={t('search')}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border-0 text-stone-800 text-base focus:ring-2 focus:ring-emerald-400 outline-none shadow-lg"
                  />
                </div>
                <button
                  type="submit"
                  aria-label={t('search')}
                  className="px-5 py-3.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition-colors shadow-lg flex items-center gap-2 flex-shrink-0"
                >
                  <Search className="h-5 w-5" />
                  <span className="hidden sm:inline">{t('search')}</span>
                </button>
              </form>

              {/* Prominent action buttons */}
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/browse"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors shadow-lg"
                >
                  <Search className="h-5 w-5" />
                  {t('browseProducts')}
                </Link>
                <Link
                  to="/sell"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 border border-emerald-400 transition-colors shadow-lg"
                >
                  <Sprout className="h-5 w-5" />
                  {t('sellProducts')}
                </Link>
              </div>

              {/* Stats — only when there are real listings */}
              {hasProducts && (
                <div className="mt-9 flex gap-8 text-sm">
                  <div>
                    <div className="text-2xl font-bold">{stats.products}+</div>
                    <div className="text-emerald-200/80">{t('productsListed')}</div>
                  </div>
                  {hasFarmers && (
                    <div>
                      <div className="text-2xl font-bold">{stats.farmers}+</div>
                      <div className="text-emerald-200/80">{t('farmersJoined')}</div>
                    </div>
                  )}
                </div>
              )}
              {!hasProducts && (
                <div className="mt-9 text-sm text-emerald-100/90 max-w-md">
                  <p>{t('marketplaceWelcomeDesc')}</p>
                </div>
              )}
            </div>
          </div>
      </section>

      {/* Quick Links */}
      <section className="py-8 md:py-10 bg-white border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {quickLinks.map((link, i) => {
              const Icon = link.icon;
              return (
                <Link
                  key={i}
                  to={link.to}
                  className="group flex items-start gap-3 p-4 rounded-xl border border-stone-200 hover:border-emerald-300 hover:shadow-md hover:bg-emerald-50/40 transition-all"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-stone-800 text-sm group-hover:text-emerald-700 transition-colors">
                      {link.label}
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5 leading-snug">{link.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 md:py-14 bg-stone-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-stone-800 mb-1">{t('categoriesTitle')}</h2>
          <p className="text-sm text-stone-500 mb-6">{t('categoriesSubtitle')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4">
            {categories.map((cat) => {
              const Icon = categoryIconMap[cat.icon] || Package;
              const name = lang === 'rw' ? cat.name_rw : cat.name_en;
              return (
                <Link
                  key={cat.id}
                  to={`/browse?category=${cat.id}`}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-stone-200 hover:border-emerald-300 hover:shadow-md hover:bg-emerald-50/50 transition-all group"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium text-stone-700 text-center group-hover:text-emerald-700 transition-colors">{name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
              <h2 className="text-2xl font-bold text-stone-800">{t('featuredProducts')}</h2>
            </div>
            {featuredProducts.length > 0 && (
              <Link to="/featured" className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-medium text-sm whitespace-nowrap">
                {t('viewAll')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
          {featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {featuredProducts.map(({ product, promotion }) => (
                <ProductCard key={product.id} product={product} promotion={promotion} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 mb-4">
                <Star className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-stone-800 mb-2">{t('noFeaturedTitle')}</h3>
              <p className="text-sm text-stone-600 max-w-xl mx-auto mb-5">{t('noFeaturedDesc')}</p>
              <Link
                to="/sell"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                <Sprout className="h-4 w-4" />
                {t('sellCtaButton')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Latest Products */}
      <section className="py-12 md:py-16 bg-stone-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-stone-800">{t('latestProducts')}</h2>
            {latestProducts.length > 0 && (
              <Link to="/browse" className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-medium text-sm whitespace-nowrap">
                {t('viewAll')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
          {latestProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
                <Sprout className="h-7 w-7" />
              </div>
              <p className="text-stone-600 mb-5">{t('noListingsYet')}</p>
              <Link
                to="/sell"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
              >
                <Sprout className="h-5 w-5" />
                {t('noListingsCta')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {latestProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-14 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-stone-800 mb-4">{t('howItWorks')}</h2>
          <div className="grid md:grid-cols-2 gap-6 md:gap-8 mt-10">
            <div className="rounded-xl border border-stone-200 p-6 md:p-8 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Sprout className="h-5 w-5" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-stone-800">{t('forFarmers')}</h3>
              </div>
              <div className="space-y-4">
                {[
                  { icon: '1', text: t('step1Farmer') },
                  { icon: '2', text: t('step2Farmer') },
                  { icon: '3', text: t('step3Farmer') },
                ].map((step) => (
                  <div key={step.icon} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                      {step.icon}
                    </span>
                    <p className="text-stone-600 leading-relaxed">{step.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-stone-200 p-6 md:p-8 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <Search className="h-5 w-5" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-stone-800">{t('forBuyers')}</h3>
              </div>
              <div className="space-y-4">
                {[
                  { icon: '1', text: t('step1Buyer') },
                  { icon: '2', text: t('step2Buyer') },
                  { icon: '3', text: t('step3Buyer') },
                ].map((step) => (
                  <div key={step.icon} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">
                      {step.icon}
                    </span>
                    <p className="text-stone-600 leading-relaxed">{step.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features and Benefits */}
      <section className="py-12 md:py-16 bg-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 mb-4">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-stone-800 mb-2">{t('promoteProductsTitle')}</h3>
              <p className="text-sm text-stone-600">{t('promoteProductsDesc', { price: formatRWF(1000) })}</p>
            </div>
            <div className="text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700 mb-4">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-stone-800 mb-2">{t('connectDirectlyTitle')}</h3>
              <p className="text-sm text-stone-600">{t('connectDirectlyDesc')}</p>
            </div>
            <div className="text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-teal-700 mb-4">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-stone-800 mb-2">{t('transparentCommissionShort')}</h3>
              <p className="text-sm text-stone-600">{t('transparentCommissionShortDesc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="py-12 md:py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-stone-800 mb-2">{t('testimonialsTitle')}</h2>
              <p className="text-sm text-stone-500 max-w-2xl mx-auto">{t('testimonialsSubtitle')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((tm) => {
                const quoteText = lang === 'rw' && tm.quote_rw ? tm.quote_rw : tm.quote;
                return (
                  <div
                    key={tm.id}
                    className="relative rounded-xl border border-stone-200 p-6 hover:shadow-md transition-shadow bg-stone-50/50"
                  >
                    <Quote className="absolute top-4 right-4 h-8 w-8 text-emerald-100" />
                    <div className="flex gap-0.5 mb-3">
                      {Array.from({ length: tm.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                    <p className="text-stone-700 leading-relaxed text-sm mb-5 pr-8">{quoteText}</p>
                    <div className="flex items-center gap-3">
                      {tm.photo_url ? (
                        <img
                          src={tm.photo_url}
                          alt={tm.name}
                          className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                          loading="lazy"
                          decoding="async"
                          width={40}
                          height={40}
                        />
                      ) : (
                        <div className="flex h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 items-center justify-center font-semibold text-sm flex-shrink-0">
                          {tm.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-stone-800 text-sm truncate">{tm.name}</p>
                        <p className="text-xs text-stone-500 truncate">
                          {tm.sector ? `${tm.sector}, ` : ''}{tm.district}
                          {tm.product_type ? ` · ${t('testimonialProduct')} ${tm.product_type}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Sell CTA — final section */}
      <section className="py-12 md:py-16 bg-gradient-to-br from-emerald-700 to-teal-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 mb-4">
            <Sprout className="h-7 w-7" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-3">{t('sellCtaTitle')}</h2>
          <p className="text-base md:text-lg text-emerald-100 max-w-2xl mx-auto mb-7">{t('sellCtaSubtitle')}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/sell"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors shadow-lg"
            >
              <Sprout className="h-5 w-5" />
              {t('sellCtaButton')}
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 border border-emerald-400 transition-colors"
            >
              {t('becomeSeller')}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
