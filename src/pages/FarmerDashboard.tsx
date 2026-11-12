import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { StatCard } from '@/components/StatCard';
import { SignOutButton } from '@/components/SignOutButton';
import { Loading, EmptyState } from '@/components/Feedback';
import { ImageUpload } from '@/components/ImageUpload';
import { formatRWF, formatDate, isPromotionActive, daysUntil } from '@/lib/format';
import {
  Package, MessageSquare, DollarSign, Star, Plus, Pencil, Trash2, X,
  CheckCircle, Phone, MessageCircle, TrendingUp, AlertCircle, Eye, EyeOff,
  UserCircle, Save,
} from 'lucide-react';
import type { Product, Category, Enquiry, Sale, Promotion, PlatformSettings } from '@/lib/types';
import { productErrorKey } from '@/lib/product-errors';

type Tab = 'overview' | 'profile' | 'listings' | 'enquiries' | 'sales' | 'promotions';

function isValidRwandaPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s-]/g, '');
  return /^(\+250[0-9]{9}|0[0-9]{9})$/.test(cleaned);
}

export function FarmerDashboard() {
  const { t, lang } = useLanguage();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');

  const [products, setProducts] = useState<Product[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);

  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [showPromoteForm, setShowPromoteForm] = useState<Product | null>(null);
  const [promotePickerOpen, setPromotePickerOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [prodRes, enqRes, saleRes, promoRes, catRes, setRes] = await Promise.all([
      supabase.from('products').select(`*, category:categories(*)`).eq('farmer_id', user.id).order('created_at', { ascending: false }),
      supabase.from('enquiries').select(`*, product:products(*)`).eq('farmer_id', user.id).order('created_at', { ascending: false }),
      supabase.from('sales').select(`*, product:products(*)`).eq('farmer_id', user.id).order('created_at', { ascending: false }),
      supabase.from('promotions').select(`*, product:products(*)`).eq('farmer_id', user.id).order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('platform_settings').select('*').maybeSingle(),
    ]);

    setProducts((prodRes.data || []) as Product[]);
    setEnquiries((enqRes.data || []) as Enquiry[]);
    setSales((saleRes.data || []) as Sale[]);
    setPromotions((promoRes.data || []) as Promotion[]);
    setCategories((catRes.data || []) as Category[]);
    setSettings(setRes.data as PlatformSettings | null);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const activeListings = products.filter(p => p.status === 'active');
  const featuredCount = promotions.filter(p => isPromotionActive(p)).length;
  const pendingPromos = promotions.filter(p => p.payment_status === 'pending');
  const confirmedSales = sales.filter(s => s.status === 'confirmed' || s.status === 'completed');
  const totalSalesValue = confirmedSales.reduce((sum, s) => sum + Number(s.sale_amount), 0);
  const commissionOwed = confirmedSales.filter(s => s.status === 'confirmed').reduce((sum, s) => sum + Number(s.commission_amount), 0);
  const newEnquiries = enquiries.filter(e => e.status === 'new');

  if (loading) return <Loading fullScreen text="Loading your dashboard..." />;

  const tabs: { key: Tab; label: string; icon: typeof Package; badge?: number }[] = [
    { key: 'overview', label: 'Overview', icon: Package },
    { key: 'profile', label: t('sellerProfile'), icon: UserCircle },
    { key: 'listings', label: t('totalListings'), icon: Package, badge: activeListings.length },
    { key: 'enquiries', label: t('buyerEnquiries'), icon: MessageSquare, badge: newEnquiries.length },
    { key: 'sales', label: 'Sales', icon: DollarSign, badge: confirmedSales.length },
    { key: 'promotions', label: 'Promotions', icon: Star, badge: pendingPromos.length },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{t('farmerDashboard')}</h1>
            <p className="text-emerald-100 mt-1">{profile?.full_name} — {profile?.district}</p>
          </div>
          <SignOutButton />
        </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-6 border-b border-stone-200">
          {tabs.map(tb => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === tb.key
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              <tb.icon className="h-4 w-4" />
              {tb.label}
              {tb.badge !== undefined && tb.badge > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                  {tb.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label={t('activeListings')} value={activeListings.length} icon={Package} color="emerald" />
              <StatCard label={t('featuredProductsCount')} value={featuredCount} icon={Star} color="amber" />
              <StatCard label={t('buyerEnquiries')} value={enquiries.length} icon={MessageSquare} color="blue" hint={`${newEnquiries.length} new`} />
              <StatCard label={t('confirmedSales')} value={confirmedSales.length} icon={DollarSign} color="teal" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label={t('totalSalesValue')} value={formatRWF(totalSalesValue)} icon={DollarSign} color="emerald" />
              <StatCard label={t('commissionOwed')} value={formatRWF(commissionOwed)} icon={AlertCircle} color="amber" />
              <StatCard label={t('pendingPromotions')} value={pendingPromos.length} icon={TrendingUp} color="stone" />
              <StatCard label={t('totalListings')} value={products.length} icon={Package} color="blue" />
            </div>

            {newEnquiries.length > 0 && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                <h3 className="font-semibold text-blue-800 mb-3">New Enquiries</h3>
                <div className="space-y-2">
                  {newEnquiries.slice(0, 3).map(enq => (
                    <div key={enq.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-blue-100">
                      <div>
                        <p className="text-sm font-medium text-stone-800">{enq.buyer_name}</p>
                        <p className="text-xs text-stone-500">{enq.product?.name} — {formatDate(enq.created_at)}</p>
                      </div>
                      <button onClick={() => setTab('enquiries')} className="text-sm text-blue-600 hover:text-blue-800 font-medium">View</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button onClick={() => { setEditingProduct(null); setShowProductForm(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors">
                <Plus className="h-5 w-5" />
                {t('addProduct')}
              </button>
              <button
                onClick={() => setPromotePickerOpen(true)}
                disabled={activeListings.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={activeListings.length === 0 ? 'Add a product first' : 'Feature a product on the homepage'}
              >
                <Star className="h-5 w-5" />
                {t('promoteProduct')}
              </button>
              <button onClick={() => setShowSaleForm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-stone-300 text-stone-700 font-medium hover:bg-stone-100 transition-colors">
                <DollarSign className="h-5 w-5" />
                {t('reportSale')}
              </button>
            </div>

            {(!profile?.phone || !isValidRwandaPhone(profile.phone)) && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-800 mb-1">{t('completeProfile')}</h3>
                  <p className="text-sm text-amber-700 mb-3">{t('completeProfileMsg')}</p>
                  <button onClick={() => setTab('profile')} className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors">
                    {t('completeProfile')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Profile */}
        {tab === 'profile' && (
          <ProfileTab />
        )}

        {/* Listings */}
        {tab === 'listings' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-stone-800">{t('totalListings')} ({products.length})</h2>
              <button onClick={() => { setEditingProduct(null); setShowProductForm(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors">
                <Plus className="h-4 w-4" />
                {t('addProduct')}
              </button>
            </div>
            {products.length === 0 ? (
              <EmptyState icon={<Package className="h-12 w-12" />} title="No Products Yet" message="Start selling by adding your first product listing." action={
                <button onClick={() => setShowProductForm(true)} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">{t('addProduct')}</button>
              } />
            ) : (
              <div className="space-y-3">
                {products.map(prod => (
                  <ProductRow
                    key={prod.id}
                    product={prod}
                    lang={lang}
                    onEdit={() => { setEditingProduct(prod); setShowProductForm(true); }}
                    onToggleStatus={async () => {
                      const newStatus = prod.status === 'active' ? 'paused' : 'active';
                      await supabase.from('products').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', prod.id);
                      loadData();
                    }}
                    onDelete={async () => {
                      if (!confirm('Delete this product? This cannot be undone.')) return;
                      await supabase.from('products').delete().eq('id', prod.id);
                      loadData();
                    }}
                    onPromote={() => setShowPromoteForm(prod)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Enquiries */}
        {tab === 'enquiries' && (
          <div>
            <h2 className="text-lg font-bold text-stone-800 mb-4">{t('buyerEnquiries')} ({enquiries.length})</h2>
            {enquiries.length === 0 ? (
              <EmptyState icon={<MessageSquare className="h-12 w-12" />} title="No Enquiries Yet" message="When buyers send enquiries about your products, they will appear here." />
            ) : (
              <div className="space-y-3">
                {enquiries.map(enq => (
                  <div key={enq.id} className="rounded-xl border border-stone-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-stone-800">{enq.buyer_name}</span>
                          <EnquiryBadge status={enq.status} />
                        </div>
                        <p className="text-sm text-stone-500 mb-2">{enq.product?.name} — {formatDate(enq.created_at)}</p>
                        {enq.message && <p className="text-sm text-stone-600 bg-stone-50 rounded-lg p-2 mb-2">{enq.message}</p>}
                        <div className="flex flex-wrap gap-3 text-sm">
                          <a href={`tel:${enq.buyer_phone}`} className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800">
                            <Phone className="h-3.5 w-3.5" /> {enq.buyer_phone}
                          </a>
                          {enq.buyer_whatsapp && (
                            <a href={`https://wa.me/${enq.buyer_whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-green-600 hover:text-green-800">
                              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                            </a>
                          )}
                          <span className="text-stone-400 font-mono text-xs">{enq.reference}</span>
                        </div>
                      </div>
                      <EnquiryActions enquiry={enq} onUpdate={loadData} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sales */}
        {tab === 'sales' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-stone-800">Sales History ({sales.length})</h2>
              <button onClick={() => setShowSaleForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors">
                <Plus className="h-4 w-4" />
                {t('reportSale')}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <StatCard label={t('totalSalesValue')} value={formatRWF(totalSalesValue)} icon={DollarSign} color="emerald" />
              <StatCard label={t('commissionOwed')} value={formatRWF(commissionOwed)} icon={AlertCircle} color="amber" />
              <StatCard label={t('confirmedSales')} value={confirmedSales.length} icon={CheckCircle} color="teal" />
            </div>
            {sales.length === 0 ? (
              <EmptyState icon={<DollarSign className="h-12 w-12" />} title="No Sales Reported" message="Report a sale when a transaction is completed to track your earnings and commission." action={
                <button onClick={() => setShowSaleForm(true)} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">{t('reportSale')}</button>
              } />
            ) : (
              <div className="space-y-3">
                {sales.map(sale => (
                  <div key={sale.id} className="rounded-xl border border-stone-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-stone-800">{sale.product?.name}</span>
                          <SaleBadge status={sale.status} />
                        </div>
                        <p className="text-sm text-stone-500">
                          {sale.quantity_sold} {sale.unit} — {formatRWF(Number(sale.sale_amount))} — {formatDate(sale.created_at)}
                        </p>
                        <p className="text-xs text-stone-400 mt-1">
                          Commission: {formatRWF(Number(sale.commission_amount))} — You receive: {formatRWF(Number(sale.seller_amount))}
                        </p>
                      </div>
                      {sale.status === 'reported' && (
                        <button
                          onClick={async () => {
                            await supabase.from('sales').update({ status: 'confirmed', farmer_confirmed: true, confirmed_at: new Date().toISOString() }).eq('id', sale.id);
                            loadData();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                        >
                          {t('confirmSale')}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Promotions */}
        {tab === 'promotions' && (
          <div>
            <h2 className="text-lg font-bold text-stone-800 mb-4">{t('promotionHistory')} ({promotions.length})</h2>
            {promotions.length === 0 ? (
              <EmptyState icon={<Star className="h-12 w-12" />} title="No Promotions Yet" message="Promote your products to reach more buyers for just RWF 1,000 for 7 days." />
            ) : (
              <div className="space-y-3">
                {promotions.map(promo => {
                  const active = isPromotionActive(promo);
                  const remaining = active ? daysUntil(promo.end_date) : 0;
                  return (
                    <div key={promo.id} className="rounded-xl border border-stone-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-stone-800">{promo.product?.name}</span>
                            {active ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">Active — {remaining}d left</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 text-xs font-semibold capitalize">{promo.payment_status}</span>
                            )}
                          </div>
                          <p className="text-sm text-stone-500">
                            {formatRWF(Number(promo.amount))} — {promo.duration_days} days — {formatDate(promo.start_date)} to {formatDate(promo.end_date)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      {showProductForm && (
        <ProductFormModal
          product={editingProduct}
          categories={categories}
          onClose={() => { setShowProductForm(false); setEditingProduct(null); }}
          onSaved={() => { setShowProductForm(false); setEditingProduct(null); loadData(); }}
          farmerId={user!.id}
        />
      )}

      {/* Sale Form Modal */}
      {showSaleForm && (
        <SaleFormModal
          products={activeListings}
          commissionRate={settings?.commission_rate ?? 0.01}
          onClose={() => setShowSaleForm(false)}
          onSaved={() => { setShowSaleForm(false); loadData(); }}
          farmerId={user!.id}
        />
      )}

      {/* Promote Form Modal */}
      {showPromoteForm && settings && (
        <PromoteFormModal
          product={showPromoteForm}
          settings={settings}
          onClose={() => setShowPromoteForm(null)}
          onSaved={() => { setShowPromoteForm(null); loadData(); }}
          farmerId={user!.id}
        />
      )}

      {/* Promote Picker Modal */}
      {promotePickerOpen && (
        <ModalShell title={t('promoteProduct')} onClose={() => setPromotePickerOpen(false)}>
          {activeListings.length === 0 ? (
            <p className="text-sm text-stone-500">You need an active listing before you can promote one. Add a product first.</p>
          ) : (
            <>
              <p className="text-sm text-stone-500 mb-4">Choose which product to feature on the homepage and Featured page for {settings ? `${settings.promotion_duration_days} days` : '7 days'}.</p>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {activeListings.map(prod => (
                  <button
                    key={prod.id}
                    onClick={() => { setPromotePickerOpen(false); setShowPromoteForm(prod); }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-stone-200 hover:border-amber-300 hover:bg-amber-50 transition-colors text-left"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                      {prod.image_url ? (
                        <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="h-5 w-5 text-stone-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-stone-800 truncate">{prod.name}</p>
                      <p className="text-xs text-stone-500">{formatRWF(prod.price)} / {prod.unit}</p>
                    </div>
                    <Star className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </>
          )}
        </ModalShell>
      )}
    </div>
  );
}

// --- Sub-components ---

function ProductRow({ product, lang, onEdit, onToggleStatus, onDelete, onPromote }: {
  product: Product;
  lang: 'en' | 'rw';
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  onPromote: () => void;
}) {
  const catName = product.category ? (lang === 'rw' ? product.category.name_rw : product.category.name_en) : '';
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 flex flex-wrap items-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <Package className="h-6 w-6 text-stone-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-stone-800 truncate">{product.name}</h3>
          {product.status === 'paused' && <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 text-xs">Paused</span>}
        </div>
        <p className="text-sm text-stone-500">{catName} — {formatRWF(product.price)} / {product.unit} — {product.quantity_available} {product.unit} available</p>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={onPromote} title="Promote" className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors">
          <Star className="h-4 w-4" />
        </button>
        <button onClick={onToggleStatus} title={product.status === 'active' ? 'Pause' : 'Activate'} className="p-2 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors">
          {product.status === 'active' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <button onClick={onEdit} title="Edit" className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors">
          <Pencil className="h-4 w-4" />
        </button>
        <button onClick={onDelete} title="Delete" className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function EnquiryBadge({ status }: { status: Enquiry['status'] }) {
  const map = {
    new: 'bg-blue-100 text-blue-700',
    contacted: 'bg-amber-100 text-amber-700',
    converted: 'bg-emerald-100 text-emerald-700',
    closed: 'bg-stone-100 text-stone-500',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status]}`}>{status}</span>;
}

function EnquiryActions({ enquiry, onUpdate }: { enquiry: Enquiry; onUpdate: () => void }) {
  const updateStatus = async (status: Enquiry['status']) => {
    await supabase.from('enquiries').update({ status }).eq('id', enquiry.id);
    onUpdate();
  };
  if (enquiry.status === 'new') return (
    <div className="flex gap-1">
      <button onClick={() => updateStatus('contacted')} className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-sm font-medium hover:bg-amber-200">Mark Contacted</button>
      <button onClick={() => updateStatus('converted')} className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-medium hover:bg-emerald-200">Converted</button>
    </div>
  );
  if (enquiry.status === 'contacted') return (
    <button onClick={() => updateStatus('converted')} className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-medium hover:bg-emerald-200">Converted</button>
  );
  return null;
}

function SaleBadge({ status }: { status: Sale['status'] }) {
  const map = {
    reported: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-amber-100 text-amber-700',
    disputed: 'bg-red-100 text-red-700',
    cancelled: 'bg-stone-100 text-stone-500',
    completed: 'bg-emerald-100 text-emerald-700',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status]}`}>{status}</span>;
}

// --- Profile Tab ---

function ProfileTab() {
  const { t } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    whatsapp: profile?.whatsapp || '',
    district: profile?.district || 'Gisagara',
    sector: profile?.sector || '',
    business_description: profile?.business_description || '',
    profile_photo_url: profile?.profile_photo_url || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');

    if (!isValidRwandaPhone(form.phone)) {
      setPhoneError(t('invalidPhone'));
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name,
        phone: form.phone,
        whatsapp: form.whatsapp,
        district: form.district,
        sector: form.sector,
        business_description: form.business_description,
        profile_photo_url: form.profile_photo_url,
      })
      .eq('id', user!.id);

    setSaving(false);

    if (error) {
      setPhoneError(error.message);
      return;
    }

    await refreshProfile();
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-bold text-stone-800 mb-1">{t('sellerProfile')}</h2>
      <p className="text-sm text-stone-500 mb-6">Update your seller information. Buyers will see this on your products and profile page.</p>

      {/* Profile preview */}
      <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-stone-50 border border-stone-200">
        <div className="h-16 w-16 rounded-full overflow-hidden bg-emerald-100 flex items-center justify-center flex-shrink-0">
          {form.profile_photo_url ? (
            <img src={form.profile_photo_url} alt={form.full_name} className="w-full h-full object-cover" />
          ) : (
            <UserCircle className="h-8 w-8 text-emerald-400" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-stone-800 truncate">{form.full_name || 'Your name'}</p>
          <p className="text-sm text-stone-500 truncate">{form.sector ? `${form.sector}, ` : ''}{form.district}</p>
          {form.phone && <p className="text-sm text-emerald-600 flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3" /> {form.phone}</p>}
        </div>
      </div>

      {savedMsg && (
        <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
          <CheckCircle className="h-4 w-4" />
          {t('profileSaved')}
        </div>
      )}
      {phoneError && (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          {phoneError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl border border-stone-200 p-6">
        <div>
          <label className={labelClass}>{t('fullName')} / Business Name</label>
          <input
            required
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className={inputClass}
            placeholder="Jean Pierre Habimana"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>{t('phone')} <span className="text-red-500">*</span></label>
            <input
              required
              type="tel"
              value={form.phone}
              onChange={(e) => { setForm({ ...form, phone: e.target.value }); setPhoneError(''); }}
              className={inputClass}
              placeholder="+250 788 000 000"
            />
            <p className="text-xs text-stone-400 mt-1">Rwanda format: +250XXXXXXXXX or 0XXXXXXXXX</p>
          </div>
          <div>
            <label className={labelClass}>{t('whatsappNumber')}</label>
            <input
              type="tel"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              className={inputClass}
              placeholder="+250 788 000 000"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>{t('district')}</label>
            <input
              required
              value={form.district}
              onChange={(e) => setForm({ ...form, district: e.target.value })}
              className={inputClass}
              placeholder="Gisagara"
            />
          </div>
          <div>
            <label className={labelClass}>{t('sector')}</label>
            <input
              value={form.sector}
              onChange={(e) => setForm({ ...form, sector: e.target.value })}
              className={inputClass}
              placeholder="Muganza"
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>{t('businessDescription')}</label>
          <textarea
            value={form.business_description}
            onChange={(e) => setForm({ ...form, business_description: e.target.value })}
            rows={3}
            className={inputClass}
            placeholder="We grow fresh vegetables and cereals in Gisagara. Family farm since 2015."
          />
        </div>

        <div>
          <ImageUpload
            label={t('profilePhoto')}
            value={form.profile_photo_url}
            onChange={(url) => setForm({ ...form, profile_photo_url: url })}
            shape="circle"
            size={96}
            userId={user!.id}
            folder="profile"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <Save className="h-5 w-5" />
            {saving ? 'Saving...' : t('saveProfile')}
          </button>
        </div>
      </form>
    </div>
  );
}

// --- Modals ---

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-stone-200">
          <h3 className="text-lg font-bold text-stone-800">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:bg-stone-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const inputClass = 'w-full px-3 py-2.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none';
const labelClass = 'block text-sm font-medium text-stone-700 mb-1';

function ProductFormModal({ product, categories, onClose, onSaved, farmerId }: {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
  farmerId: string;
}) {
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price?.toString() || '',
    unit: product?.unit || 'kg',
    quantity_available: product?.quantity_available?.toString() || '',
    category_id: product?.category_id || '',
    district: product?.district || 'Gisagara',
    sector: product?.sector || '',
    village: product?.village || '',
    contact_phone: product?.contact_phone || '',
    contact_whatsapp: product?.contact_whatsapp || '',
    image_url: product?.image_url || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    if (product) {
      const payload = {
        ...form,
        farmer_id: farmerId,
        price: parseFloat(form.price) || 0,
        quantity_available: parseFloat(form.quantity_available) || 0,
        category_id: form.category_id || null,
        status: product.status,
      };
      const { error: updateError } = await supabase.from('products').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', product.id);
      setSaving(false);
      if (updateError) {
        setFormError(t(productErrorKey(updateError.message)));
        return;
      }
    } else {
      const { error: rpcError } = await supabase.rpc('publish_product', {
        p_name: form.name,
        p_description: form.description,
        p_price: parseFloat(form.price) || 0,
        p_unit: form.unit,
        p_quantity_available: parseFloat(form.quantity_available) || 0,
        p_category_id: form.category_id || null,
        p_district: form.district,
        p_sector: form.sector,
        p_village: form.village,
        p_contact_phone: form.contact_phone,
        p_contact_whatsapp: form.contact_whatsapp,
        p_image_url: form.image_url,
      });
      setSaving(false);
      if (rpcError) {
        setFormError(t(productErrorKey(rpcError.message)));
        return;
      }
    }
    onSaved();
  };

  return (
    <ModalShell title={product ? t('editProduct') : t('addProduct')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className={labelClass}>{t('productName')}</label><input required maxLength={120} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} /></div>
        <div><label className={labelClass}>{t('productDescription')}</label><textarea required maxLength={2000} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className={inputClass} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>{t('productPrice')}</label><input required type="number" min="0.01" max="10000000" step="any" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className={inputClass} /></div>
          <div><label className={labelClass}>{t('productUnit')}</label>
            <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className={inputClass}>
              {['kg', 'sack', 'basket', 'tonne', 'piece', 'litre', 'dozen'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>{t('productQuantity')}</label><input required type="number" min="0" max="1000000" step="any" value={form.quantity_available} onChange={e => setForm({ ...form, quantity_available: e.target.value })} className={inputClass} /></div>
          <div><label className={labelClass}>{t('category')}</label>
            <select required value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className={inputClass}>
              <option value="" disabled>{t('selectCategory')}</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name_en}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>{t('sector')}</label><input required maxLength={100} value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })} className={inputClass} /></div>
          <div><label className={labelClass}>{t('village')}</label><input required maxLength={100} value={form.village} onChange={e => setForm({ ...form, village: e.target.value })} className={inputClass} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>{t('phone')}</label><input maxLength={20} value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} className={inputClass} /></div>
          <div><label className={labelClass}>{t('whatsappNumber')}</label><input maxLength={20} value={form.contact_whatsapp} onChange={e => setForm({ ...form, contact_whatsapp: e.target.value })} className={inputClass} /></div>
        </div>
        <ImageUpload
          label={t('productImage')}
          value={form.image_url}
          onChange={(url) => setForm({ ...form, image_url: url })}
          shape="square"
          size={96}
          userId={farmerId}
          folder="products"
          onUploadingChange={setImageUploading}
        />
        {formError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{formError}</div>
        )}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-stone-300 text-stone-700 font-medium hover:bg-stone-50">{t('cancel')}</button>
          <button type="submit" disabled={saving || imageUploading} className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50">{imageUploading ? t('uploadingImage') : saving ? t('saving') : t('save')}</button>
        </div>
      </form>
    </ModalShell>
  );
}

function SaleFormModal({ products, commissionRate, onClose, onSaved, farmerId }: {
  products: Product[];
  commissionRate: number;
  onClose: () => void;
  onSaved: () => void;
  farmerId: string;
}) {
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    product_id: '',
    sale_amount: '',
    quantity_sold: '',
    unit: 'kg',
    buyer_name: '',
  });

  const amount = parseFloat(form.sale_amount) || 0;
  const commission = amount * commissionRate;
  const sellerAmount = amount - commission;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('sales').insert({
      product_id: form.product_id,
      farmer_id: farmerId,
      sale_amount: amount,
      quantity_sold: parseFloat(form.quantity_sold) || 0,
      unit: form.unit,
      buyer_name: form.buyer_name,
      commission_rate: commissionRate,
      commission_amount: commission,
      seller_amount: sellerAmount,
      status: 'reported',
    });
    setSaving(false);
    onSaved();
  };

  return (
    <ModalShell title={t('reportSale')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className={labelClass}>{t('productName')}</label>
          <select required value={form.product_id} onChange={e => { const p = products.find(x => x.id === e.target.value); setForm({ ...form, product_id: e.target.value, unit: p?.unit || 'kg' }); }} className={inputClass}>
            <option value="">Select product...</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>{t('saleAmount')}</label><input required type="number" value={form.sale_amount} onChange={e => setForm({ ...form, sale_amount: e.target.value })} className={inputClass} /></div>
          <div><label className={labelClass}>{t('quantitySold')}</label><input required type="number" value={form.quantity_sold} onChange={e => setForm({ ...form, quantity_sold: e.target.value })} className={inputClass} /></div>
        </div>
        <div><label className={labelClass}>{t('buyerName')}</label><input value={form.buyer_name} onChange={e => setForm({ ...form, buyer_name: e.target.value })} className={inputClass} /></div>
        <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-stone-500">Commission ({(commissionRate * 100).toFixed(1)}%):</span><span className="font-medium text-amber-600">{formatRWF(commission)}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">You receive:</span><span className="font-bold text-emerald-600">{formatRWF(sellerAmount)}</span></div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-stone-300 text-stone-700 font-medium hover:bg-stone-50">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Saving...' : 'Report Sale'}</button>
        </div>
      </form>
    </ModalShell>
  );
}

function PromoteFormModal({ product, settings, onClose, onSaved, farmerId }: {
  product: Product;
  settings: PlatformSettings;
  onClose: () => void;
  onSaved: () => void;
  farmerId: string;
}) {
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('promotions').insert({
      product_id: product.id,
      farmer_id: farmerId,
      amount: settings.promotion_price,
      duration_days: settings.promotion_duration_days,
      payment_status: 'pending',
    });
    setSaving(false);
    onSaved();
  };

  return (
    <ModalShell title={t('promoteProduct')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800">Promote <strong>{product.name}</strong> for {settings.promotion_duration_days} days.</p>
        </div>
        <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-stone-500">Promotion fee:</span><span className="font-bold text-emerald-600">{formatRWF(settings.promotion_price)}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Duration:</span><span className="font-medium text-stone-700">{settings.promotion_duration_days} days</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Placement:</span><span className="font-medium text-stone-700">Homepage + Featured page</span></div>
        </div>
        <p className="text-xs text-stone-500">Your promotion will be activated after payment verification by the platform admin. You will be contacted with payment instructions.</p>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-stone-300 text-stone-700 font-medium hover:bg-stone-50">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-50">{saving ? 'Submitting...' : 'Request Promotion'}</button>
        </div>
      </form>
    </ModalShell>
  );
}
