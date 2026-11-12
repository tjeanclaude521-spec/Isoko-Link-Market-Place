import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { ProductCard } from '@/components/ProductCard';
import { PageHeader } from '@/components/PageHeader';
import { Loading, EmptyState } from '@/components/Feedback';
import { Search, SlidersHorizontal, X, Loader2, Sprout, ArrowRight, ShoppingBag } from 'lucide-react';
import type { Product, Category, Promotion } from '@/lib/types';
import { useDocumentMeta, useJsonLd, SITE_ORIGIN } from '@/lib/use-document-meta';

const PAGE_SIZE = 12;

export function BrowsePage() {
  const { t, lang } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  useDocumentMeta({
    title: 'Browse Agricultural Products — Isoko Link Gisagara',
    description: t('metaBrowseDesc'),
    canonicalPath: '/browse',
  });

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [promotions, setPromotions] = useState<Record<string, Promotion>>({});
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '');
  const [districtFilter, setDistrictFilter] = useState(searchParams.get('district') || searchParams.get('location') || '');
  const [sectorFilter, setSectorFilter] = useState(searchParams.get('sector') || '');
  const [villageFilter, setVillageFilter] = useState(searchParams.get('village') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [showFilters, setShowFilters] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const debouncedSearch = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearchValue, setDebouncedSearchValue] = useState(searchParams.get('q') || '');

  const itemListJsonLd = products.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_ORIGIN}/product/${p.id}`,
      name: p.name,
    })),
  } : { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: [] };
  useJsonLd(itemListJsonLd);

  useEffect(() => {
    (async () => {
      const { data: cats } = await supabase.from('categories').select('*').order('sort_order');
      setCategories((cats || []) as Category[]);
    })();
  }, []);

  useEffect(() => {
    if (debouncedSearch.current) clearTimeout(debouncedSearch.current);
    debouncedSearch.current = setTimeout(() => setDebouncedSearchValue(search), 350);
    return () => { if (debouncedSearch.current) clearTimeout(debouncedSearch.current); };
  }, [search]);

  const fetchProducts = useCallback(async (cursor?: string) => {
    const isLoadMore = !!cursor;
    if (isLoadMore) setLoadingMore(true); else setLoading(true);
    let query = supabase
      .from('products')
      .select(`*, category:categories(*)`)
      .eq('status', 'active');

    if (debouncedSearchValue) {
      query = query.ilike('name', `%${debouncedSearchValue}%`);
    }
    if (categoryFilter) {
      query = query.eq('category_id', categoryFilter);
    }
    const locationFilters: Array<[keyof Product, string]> = [
      ['district', districtFilter],
      ['sector', sectorFilter],
      ['village', villageFilter],
    ];
    for (const [field, value] of locationFilters) {
      const normalizedValue = value.trim();
      if (normalizedValue) {
        query = query.ilike(field, `%${normalizedValue}%`);
      }
    }

    if (sortBy === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sortBy === 'priceLowHigh') {
      query = query.order('price', { ascending: true });
    } else if (sortBy === 'priceHighLow') {
      query = query.order('price', { ascending: false });
    }

    if (cursor) query = query.lt('created_at', cursor);
    query = query.limit(PAGE_SIZE + 1);

    const { data } = await query;
    const fetched = (data || []) as Product[];
    const moreAvailable = fetched.length > PAGE_SIZE;
    const slice = moreAvailable ? fetched.slice(0, PAGE_SIZE) : fetched;

    setProducts((prev) => (isLoadMore ? [...prev, ...slice] : slice));
    setHasMore(moreAvailable);

    // Fetch active promotions for the visible products
    if (slice.length > 0) {
      const productIds = slice.map((p) => p.id);
      const { data: promos } = await supabase
        .from('promotions')
        .select('*')
        .in('product_id', productIds)
        .eq('payment_status', 'paid');
      const promoMap: Record<string, Promotion> = {};
      for (const p of promos || []) {
        if (p.end_date && new Date(p.end_date) > new Date()) {
          promoMap[p.product_id] = p as Promotion;
        }
      }
      if (isLoadMore) {
        setPromotions((prev) => ({ ...prev, ...promoMap }));
      } else {
        setPromotions(promoMap);
      }
    } else {
      setPromotions({});
    }

    if (isLoadMore) setLoadingMore(false); else setLoading(false);
  }, [debouncedSearchValue, categoryFilter, districtFilter, sectorFilter, villageFilter, sortBy]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const loadMore = () => {
    if (!products.length) return;
    const oldest = products[products.length - 1]?.created_at;
    if (oldest) fetchProducts(oldest);
  };

  const applyFilters = () => {
    const params: Record<string, string> = {};
    if (search) params.q = search;
    if (categoryFilter) params.category = categoryFilter;
    if (districtFilter.trim()) params.district = districtFilter.trim();
    if (sectorFilter.trim()) params.sector = sectorFilter.trim();
    if (villageFilter.trim()) params.village = villageFilter.trim();
    if (sortBy !== 'newest') params.sort = sortBy;
    setSearchParams(params);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('');
    setDistrictFilter('');
    setSectorFilter('');
    setVillageFilter('');
    setSortBy('newest');
    setSearchParams({});
  };

  const hasFilters = search || categoryFilter || districtFilter || sectorFilter || villageFilter;

  return (
    <div>
      <PageHeader title={t('browse')} subtitle={t('browseSubtitle')} />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-2">
        <div className="prose prose-stone max-w-none">
          <h2 className="text-xl font-bold text-stone-800 mb-2">{t('browseTitle')}</h2>
          <p className="text-stone-600 leading-relaxed">
            {t('browseSubtitle')}
          </p>
          {categories.length > 0 && (
            <p className="text-sm text-stone-500 mt-2">
              {t('findProductsByCategory')}: {categories.map((c) => lang === 'rw' ? c.name_rw : c.name_en).join(', ')}.
            </p>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search bar */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-3 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 transition-colors lg:hidden"
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>
        </div>

        {/* Filters */}
        <div className={`${showFilters ? 'block' : 'hidden'} lg:block mb-6`}>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-stone-600 mb-1">{t('category')}</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">{t('allCategories')}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {lang === 'rw' ? cat.name_rw : cat.name_en}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-stone-600 mb-1">{t('district')}</label>
              <input
                type="text"
                placeholder={t('locationPlaceholder')}
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-stone-600 mb-1">{t('sector')}</label>
              <input
                type="text"
                placeholder={t('sector')}
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-stone-600 mb-1">{t('village')}</label>
              <input
                type="text"
                placeholder={t('village')}
                value={villageFilter}
                onChange={(e) => setVillageFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-stone-600 mb-1">{t('sortBy')}</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="newest">{t('newest')}</option>
                <option value="priceLowHigh">{t('priceLowHigh')}</option>
                <option value="priceHighLow">{t('priceHighLow')}</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={applyFilters}
                className="px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                {t('search')}
              </button>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg border border-stone-300 text-stone-600 text-sm hover:bg-stone-50 transition-colors"
                >
                  <X className="h-4 w-4" />
                  {t('clear')}
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <Loading text={t('loadingProducts')} />
        ) : products.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={<Search className="h-12 w-12" />}
              title={t('noProductsFound')}
              message={t('noProducts')}
              action={
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 rounded-lg border border-stone-300 text-stone-600 text-sm hover:bg-stone-50 transition-colors"
                >
                  {t('clear')}
                </button>
              }
            />
          ) : (
            <div className="max-w-2xl mx-auto text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-5">
                <Sprout className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-stone-800 mb-3">
                {t('noProductsYet')}
              </h2>
              <p className="text-stone-600 leading-relaxed mb-2">
                {t('browseSubtitle')}
              </p>
              <p className="text-stone-600 leading-relaxed mb-6">
                {t('noProductsYetMsg')}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/sell"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
                >
                  <ShoppingBag className="h-5 w-5" />
                  {t('sellCtaButton')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/about"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-stone-300 text-stone-700 font-medium hover:bg-stone-50 transition-colors"
                >
                  {t('about')}
                </Link>
              </div>
            </div>
          )
        ) : (
          <>
            <p className="text-sm text-stone-500 mb-4">{t('productsFound', { count: products.length })}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} promotion={promotions[product.id]} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-stone-300 text-stone-700 font-medium hover:bg-stone-50 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {loadingMore ? t('loadingMore') : t('loadMore')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
