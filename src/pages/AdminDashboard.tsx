import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { StatCard } from '@/components/StatCard';
import { SignOutButton } from '@/components/SignOutButton';
import { Loading, EmptyState } from '@/components/Feedback';
import { formatRWF, formatDateTime, formatDate } from '@/lib/format';
import {
  Users, Package, DollarSign, Star, Settings, FileText, TrendingUp,
  CheckCircle, XCircle, BadgeCheck, X, Save, ShieldCheck, AlertCircle,
  Tags, Flag, Download, Trash2, Pencil, Plus,
} from 'lucide-react';
import type { Profile, Product, Category, Payment, Promotion, Sale, AuditLog, PlatformSettings, Report } from '@/lib/types';

type Tab = 'overview' | 'users' | 'listings' | 'categories' | 'reports' | 'payments' | 'promotions' | 'sales' | 'settings' | 'audit';

function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(',')
    ),
  ];
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminDashboard() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);

  const loadData = useCallback(async () => {
    const [profRes, prodRes, catRes, payRes, promoRes, saleRes, reportRes, auditRes, setRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select(`*, category:categories(*), farmer:profiles!products_farmer_id_fkey(*)`).order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('payments').select(`*, user:profiles!payments_user_id_fkey(*)`).order('created_at', { ascending: false }),
      supabase.from('promotions').select(`*, product:products(*), farmer:profiles!promotions_farmer_id_fkey(*)`).order('created_at', { ascending: false }),
      supabase.from('sales').select(`*, product:products(*), farmer:profiles!sales_farmer_id_fkey(*)`).order('created_at', { ascending: false }),
      supabase.from('reports').select(`*, reporter:profiles!reports_reporter_id_fkey(*), reported_user:profiles!reports_reported_user_id_fkey(*), reported_product:products(*)`).order('created_at', { ascending: false }),
      supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('platform_settings').select('*').maybeSingle(),
    ]);

    setProfiles((profRes.data || []) as Profile[]);
    setProducts((prodRes.data || []) as Product[]);
    setCategories((catRes.data || []) as Category[]);
    setPayments((payRes.data || []) as Payment[]);
    setPromotions((promoRes.data || []) as Promotion[]);
    setSales((saleRes.data || []) as Sale[]);
    setReports((reportRes.data || []) as Report[]);
    setAuditLogs((auditRes.data || []) as AuditLog[]);
    setSettings(setRes.data as PlatformSettings | null);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const logAction = async (action: string, entityType: string, entityId: string | null, details: Record<string, unknown> = {}) => {
    if (!profile) return;
    await supabase.from('audit_logs').insert({ admin_id: profile.id, action, entity_type: entityType, entity_id: entityId, details });
  };

  if (loading) return <Loading fullScreen text="Loading admin dashboard..." />;

  const farmers = profiles.filter(p => p.role === 'farmer');
  const buyers = profiles.filter(p => p.role === 'buyer');
  const activeProducts = products.filter(p => p.status === 'active');
  const pendingPayments = payments.filter(p => p.status === 'pending');
  const paidPromos = promotions.filter(p => p.payment_status === 'paid');
  const confirmedSales = sales.filter(s => s.status === 'confirmed' || s.status === 'completed');
  const adRevenue = paidPromos.reduce((s, p) => s + Number(p.amount), 0);
  const commissionEarned = confirmedSales.reduce((s, x) => s + Number(x.commission_amount), 0);
  const commissionPaid = payments.filter(p => p.purpose === 'commission' && p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);
  const outstandingCommission = commissionEarned - commissionPaid;
  const totalRevenue = adRevenue + commissionPaid;
  const pendingPromotions = promotions.filter(p => p.payment_status === 'pending');
  const pendingReports = reports.filter(r => r.status === 'pending');

  const tabs: { key: Tab; label: string; icon: typeof Users; badge?: number }[] = [
    { key: 'overview', label: 'Overview', icon: TrendingUp },
    { key: 'users', label: t('manageUsers'), icon: Users, badge: profiles.length },
    { key: 'listings', label: t('manageListings'), icon: Package, badge: products.length },
    { key: 'categories', label: t('manageCategories'), icon: Tags, badge: categories.length },
    { key: 'reports', label: t('manageReports'), icon: Flag, badge: pendingReports.length },
    { key: 'payments', label: t('managePayments'), icon: DollarSign, badge: pendingPayments.length },
    { key: 'promotions', label: t('managePromotions'), icon: Star, badge: pendingPromotions.length },
    { key: 'sales', label: t('manageSales'), icon: FileText, badge: sales.length },
    { key: 'settings', label: t('manageSettings'), icon: Settings },
    { key: 'audit', label: t('auditLogs'), icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="bg-gradient-to-br from-stone-800 to-stone-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{t('adminDashboard')}</h1>
            <p className="text-stone-300 mt-1">{profile?.full_name} — Isoko Link Platform Admin</p>
            <Link to="/admin/security" className="inline-flex items-center gap-2 mt-4 px-3 py-2 rounded-lg bg-stone-700 hover:bg-stone-600 text-sm font-medium">
              <ShieldAlert className="h-4 w-4" /> Login security
            </Link>
          </div>
          <SignOutButton />
        </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap gap-1 mb-6 border-b border-stone-200 overflow-x-auto">
          {tabs.map(tb => (
            <button key={tb.key} onClick={() => setTab(tb.key)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === tb.key ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}>
              <tb.icon className="h-4 w-4" />
              {tb.label}
              {tb.badge !== undefined && tb.badge > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">{tb.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">{t('financialReports')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label={t('advertisingRevenue')} value={formatRWF(adRevenue)} icon={Star} color="amber" />
                <StatCard label={t('commissionEarned')} value={formatRWF(commissionEarned)} icon={TrendingUp} color="emerald" />
                <StatCard label={t('commissionCollected')} value={formatRWF(commissionPaid)} icon={CheckCircle} color="teal" />
                <StatCard label={t('outstandingCommissionAmount')} value={formatRWF(outstandingCommission)} icon={AlertCircle} color="red" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <StatCard label={t('totalPlatformRevenue')} value={formatRWF(totalRevenue)} icon={DollarSign} color="emerald" />
                <StatCard label={t('pendingPayments')} value={pendingPayments.length} icon={DollarSign} color="amber" />
                <StatCard label={t('marketplaceSalesValue')} value={formatRWF(confirmedSales.reduce((s, x) => s + Number(x.sale_amount), 0))} icon={FileText} color="blue" />
                <StatCard label="Refunded" value={formatRWF(payments.filter(p => p.status === 'refunded').reduce((s, p) => s + Number(p.amount), 0))} icon={XCircle} color="stone" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">Platform</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Users" value={profiles.length} icon={Users} color="blue" hint={`${farmers.length} farmers, ${buyers.length} buyers`} />
                <StatCard label="Active Listings" value={activeProducts.length} icon={Package} color="emerald" />
                <StatCard label="Active Promotions" value={paidPromos.filter((p) => p.end_date && new Date(p.end_date) > new Date()).length} icon={Star} color="amber" />
                <StatCard label="Total Sales" value={sales.length} icon={FileText} color="teal" />
              </div>
            </div>
            {pendingPromotions.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <h3 className="font-semibold text-amber-800 mb-3">Pending Promotion Requests ({pendingPromotions.length})</h3>
                <div className="space-y-2">
                  {pendingPromotions.slice(0, 5).map(promo => (
                    <div key={promo.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-100">
                      <div>
                        <p className="text-sm font-medium text-stone-800">{promo.product?.name} — {promo.farmer?.full_name || 'Unknown farmer'}</p>
                        <p className="text-xs text-stone-500">{formatRWF(Number(promo.amount))} — {promo.duration_days} days</p>
                      </div>
                      <button onClick={() => setTab('promotions')} className="text-sm text-amber-700 hover:text-amber-900 font-medium">Review</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {pendingReports.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <h3 className="font-semibold text-red-800 mb-3">Pending Reports ({pendingReports.length})</h3>
                <div className="space-y-2">
                  {pendingReports.slice(0, 5).map(rpt => (
                    <div key={rpt.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-red-100">
                      <div>
                        <p className="text-sm font-medium text-stone-800">{rpt.reason}</p>
                        <p className="text-xs text-stone-500">{rpt.reporter?.full_name} — {formatDate(rpt.created_at)}</p>
                      </div>
                      <button onClick={() => setTab('reports')} className="text-sm text-red-700 hover:text-red-900 font-medium">Review</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-stone-800">{t('manageUsers')} ({profiles.length})</h2>
              <button onClick={() => downloadCSV('users.csv', profiles.map(p => ({
                id: p.id, name: p.full_name, email: p.email, role: p.role,
                phone: p.phone, district: p.district, sector: p.sector,
                verified: p.verified, created_at: p.created_at,
              })))} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-stone-300 text-stone-700 text-sm font-medium hover:bg-stone-100 transition-colors">
                <Download className="h-4 w-4" />
                {t('exportCsv')}
              </button>
            </div>
            {profiles.length === 0 ? (
              <EmptyState icon={<Users className="h-12 w-12" />} title="No Users" message="No users have registered yet." />
            ) : (
              <div className="space-y-3">
                {profiles.map(p => (
                  <div key={p.id} className="rounded-xl border border-stone-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-white font-semibold ${
                        p.role === 'admin' ? 'bg-stone-700' : p.role === 'farmer' ? 'bg-emerald-600' : 'bg-blue-600'
                      }`}>
                        {p.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-800">{p.full_name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                            p.role === 'admin' ? 'bg-stone-100 text-stone-700' : p.role === 'farmer' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                          }`}>{p.role}</span>
                          {p.verified && <BadgeCheck className="h-4 w-4 text-emerald-600" />}
                        </div>
                        <p className="text-sm text-stone-500">{p.email} — {p.district}{p.sector ? `, ${p.sector}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!p.verified && (
                        <button onClick={async () => {
                          await supabase.from('profiles').update({ verified: true, updated_at: new Date().toISOString() }).eq('id', p.id);
                          await logAction('verify_user', 'profiles', p.id, { email: p.email });
                          loadData();
                        }} className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-medium hover:bg-emerald-200">
                          Verify
                        </button>
                      )}
                      {p.verified && p.role !== 'admin' && (
                        <button onClick={async () => {
                          await supabase.from('profiles').update({ verified: false, updated_at: new Date().toISOString() }).eq('id', p.id);
                          await logAction('unverify_user', 'profiles', p.id, { email: p.email });
                          loadData();
                        }} className="px-3 py-1.5 rounded-lg bg-stone-100 text-stone-600 text-sm font-medium hover:bg-stone-200">
                          Unverify
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Listings */}
        {tab === 'listings' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-stone-800">{t('manageListings')} ({products.length})</h2>
              <button onClick={() => downloadCSV('products.csv', products.map(p => ({
                id: p.id, name: p.name, price: p.price, unit: p.unit,
                quantity: p.quantity_available, status: p.status,
                district: p.district, sector: p.sector, farmer: p.farmer?.full_name || '',
                created_at: p.created_at,
              })))} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-stone-300 text-stone-700 text-sm font-medium hover:bg-stone-100 transition-colors">
                <Download className="h-4 w-4" />
                {t('exportCsv')}
              </button>
            </div>
            {products.length === 0 ? (
              <EmptyState icon={<Package className="h-12 w-12" />} title="No Listings" message="No products have been listed yet." />
            ) : (
              <div className="space-y-3">
                {products.map(prod => (
                  <div key={prod.id} className="rounded-xl border border-stone-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                        {prod.image_url ? <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" /> : <Package className="h-5 w-5 text-stone-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-800">{prod.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${prod.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>{prod.status}</span>
                        </div>
                        <p className="text-sm text-stone-500">{formatRWF(prod.price)} / {prod.unit} — {prod.farmer?.full_name || 'Unknown'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {prod.status === 'active' && (
                        <button onClick={async () => {
                          await supabase.from('products').update({ status: 'removed', updated_at: new Date().toISOString() }).eq('id', prod.id);
                          await logAction('remove_listing', 'products', prod.id, { name: prod.name });
                          loadData();
                        }} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100">Remove</button>
                      )}
                      {prod.status === 'removed' && (
                        <button onClick={async () => {
                          await supabase.from('products').update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', prod.id);
                          await logAction('restore_listing', 'products', prod.id, { name: prod.name });
                          loadData();
                        }} className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-sm font-medium hover:bg-emerald-100">Restore</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Categories */}
        {tab === 'categories' && (
          <CategoriesTab categories={categories} onSaved={loadData} onLog={logAction} />
        )}

        {/* Reports */}
        {tab === 'reports' && (
          <div>
            <h2 className="text-lg font-bold text-stone-800 mb-4">{t('manageReports')} ({reports.length})</h2>
            {reports.length === 0 ? (
              <EmptyState icon={<Flag className="h-12 w-12" />} title={t('noReports')} message={t('noReportsMsg')} />
            ) : (
              <div className="space-y-3">
                {reports.map(rpt => (
                  <div key={rpt.id} className="rounded-xl border border-stone-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-stone-800">{rpt.reason}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                            rpt.status === 'pending' ? 'bg-red-100 text-red-700' :
                            rpt.status === 'reviewing' ? 'bg-amber-100 text-amber-700' :
                            rpt.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-stone-100 text-stone-500'
                          }`}>{rpt.status}</span>
                        </div>
                        <p className="text-sm text-stone-600 mb-1">{rpt.description}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-stone-500">
                          <span>{t('reportReportedBy')}: {rpt.reporter?.full_name || 'Unknown'}</span>
                          {rpt.reported_user && <span>{t('reportReportedUser')}: {rpt.reported_user.full_name}</span>}
                          {rpt.reported_product && <span>{t('reportReportedProduct')}: {rpt.reported_product.name}</span>}
                          <span>{formatDate(rpt.created_at)}</span>
                        </div>
                      </div>
                      {rpt.status === 'pending' && (
                        <button onClick={async () => {
                          await supabase.from('reports').update({ status: 'reviewing' }).eq('id', rpt.id);
                          await logAction('review_report', 'reports', rpt.id, { reason: rpt.reason });
                          loadData();
                        }} className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-sm font-medium hover:bg-amber-200">
                          {t('markReviewing')}
                        </button>
                      )}
                      {(rpt.status === 'pending' || rpt.status === 'reviewing') && (
                        <div className="flex gap-1">
                          <button onClick={async () => {
                            await supabase.from('reports').update({ status: 'resolved', resolved_by: profile?.id, resolved_at: new Date().toISOString() }).eq('id', rpt.id);
                            await logAction('resolve_report', 'reports', rpt.id, { reason: rpt.reason });
                            loadData();
                          }} className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-medium hover:bg-emerald-200">
                            {t('resolveReport')}
                          </button>
                          <button onClick={async () => {
                            await supabase.from('reports').update({ status: 'dismissed', resolved_by: profile?.id, resolved_at: new Date().toISOString() }).eq('id', rpt.id);
                            await logAction('dismiss_report', 'reports', rpt.id, { reason: rpt.reason });
                            loadData();
                          }} className="px-3 py-1.5 rounded-lg bg-stone-100 text-stone-600 text-sm font-medium hover:bg-stone-200">
                            {t('dismissReport')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Payments */}
        {tab === 'payments' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-stone-800">{t('managePayments')} ({payments.length})</h2>
              <button onClick={() => downloadCSV('payments.csv', payments.map(p => ({
                id: p.id, amount: p.amount, purpose: p.purpose, status: p.status,
                method: p.payment_method, user: p.user?.email || '', ref: p.transaction_ref,
                created_at: p.created_at, verified_at: p.verified_at,
              })))} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-stone-300 text-stone-700 text-sm font-medium hover:bg-stone-100 transition-colors">
                <Download className="h-4 w-4" />
                {t('exportCsv')}
              </button>
            </div>
            {payments.length === 0 ? (
              <EmptyState icon={<DollarSign className="h-12 w-12" />} title="No Payments" message="No payment records yet. Promotion payments and commission payments will appear here." />
            ) : (
              <div className="space-y-3">
                {payments.map(pay => (
                  <div key={pay.id} className="rounded-xl border border-stone-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-800">{formatRWF(Number(pay.amount))}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          pay.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                          pay.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-stone-100 text-stone-500'
                        }`}>{pay.status}</span>
                        <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-xs font-medium">{pay.purpose}</span>
                      </div>
                      <p className="text-sm text-stone-500 mt-1">{pay.user?.email} — {formatDateTime(pay.created_at)}</p>
                      {pay.transaction_ref && <p className="text-xs text-stone-400 font-mono">Ref: {pay.transaction_ref}</p>}
                    </div>
                    {pay.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={async () => {
                          await supabase.from('payments').update({ status: 'paid', verified_by: profile?.id, verified_at: new Date().toISOString() }).eq('id', pay.id);
                          if (pay.related_promotion_id) {
                            await supabase.from('promotions').update({ payment_status: 'paid', start_date: new Date().toISOString(), end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }).eq('id', pay.related_promotion_id);
                          }
                          await logAction('verify_payment', 'payments', pay.id, { amount: pay.amount });
                          loadData();
                        }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-medium hover:bg-emerald-200">
                          <CheckCircle className="h-4 w-4" />
                          {t('verifyPayment')}
                        </button>
                        <button onClick={async () => {
                          await supabase.from('payments').update({ status: 'failed', verified_by: profile?.id, verified_at: new Date().toISOString() }).eq('id', pay.id);
                          if (pay.related_promotion_id) {
                            await supabase.from('promotions').update({ payment_status: 'failed' }).eq('id', pay.related_promotion_id);
                          }
                          await logAction('reject_payment', 'payments', pay.id, { amount: pay.amount });
                          loadData();
                        }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 text-red-600 text-sm font-medium hover:bg-red-200">
                          <XCircle className="h-4 w-4" />
                          {t('rejectPayment')}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Promotions */}
        {tab === 'promotions' && (
          <div>
            <h2 className="text-lg font-bold text-stone-800 mb-4">{t('managePromotions')} ({promotions.length})</h2>
            {promotions.length === 0 ? (
              <EmptyState icon={<Star className="h-12 w-12" />} title="No Promotions" message="No promotion requests yet." />
            ) : (
              <div className="space-y-3">
                {promotions.map(promo => (
                  <div key={promo.id} className="rounded-xl border border-stone-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-800">{promo.product?.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${promo.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : promo.payment_status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-500'}`}>{promo.payment_status}</span>
                        </div>
                        <p className="text-sm text-stone-500 mt-1">
                          {promo.farmer?.full_name} — {formatRWF(Number(promo.amount))} — {promo.duration_days} days — {formatDate(promo.created_at)}
                        </p>
                        {promo.start_date && promo.end_date && (
                          <p className="text-xs text-stone-400 mt-1">{formatDate(promo.start_date)} to {formatDate(promo.end_date)}</p>
                        )}
                      </div>
                      {promo.payment_status === 'pending' && (
                        <button onClick={async () => {
                          await supabase.from('promotions').update({
                            payment_status: 'paid',
                            start_date: new Date().toISOString(),
                            end_date: new Date(Date.now() + promo.duration_days * 24 * 60 * 60 * 1000).toISOString(),
                          }).eq('id', promo.id);
                          await supabase.from('payments').insert({
                            user_id: promo.farmer_id,
                            purpose: 'advertisement',
                            amount: promo.amount,
                            payment_method: 'manual',
                            status: 'paid',
                            related_promotion_id: promo.id,
                            verified_by: profile?.id,
                            verified_at: new Date().toISOString(),
                          });
                          await logAction('approve_promotion', 'promotions', promo.id, { product: promo.product?.name });
                          loadData();
                        }} className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-medium hover:bg-emerald-200">
                          Approve & Activate
                        </button>
                      )}
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
              <h2 className="text-lg font-bold text-stone-800">{t('manageSales')} ({sales.length})</h2>
              <button onClick={() => downloadCSV('sales.csv', sales.map(s => ({
                id: s.id, product: s.product?.name || '', farmer: s.farmer?.full_name || '',
                buyer: s.buyer_name, amount: s.sale_amount, quantity: s.quantity_sold,
                unit: s.unit, commission: s.commission_amount, seller_amount: s.seller_amount,
                status: s.status, created_at: s.created_at, confirmed_at: s.confirmed_at,
              })))} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-stone-300 text-stone-700 text-sm font-medium hover:bg-stone-100 transition-colors">
                <Download className="h-4 w-4" />
                {t('exportCsv')}
              </button>
            </div>
            {sales.length === 0 ? (
              <EmptyState icon={<FileText className="h-12 w-12" />} title="No Sales" message="No sales have been reported yet." />
            ) : (
              <div className="space-y-3">
                {sales.map(sale => (
                  <div key={sale.id} className="rounded-xl border border-stone-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-800">{sale.product?.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${sale.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : sale.status === 'confirmed' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{sale.status}</span>
                        </div>
                        <p className="text-sm text-stone-500 mt-1">
                          {formatRWF(Number(sale.sale_amount))} — {sale.quantity_sold} {sale.unit} — {formatDate(sale.created_at)}
                        </p>
                        <p className="text-xs text-stone-400 mt-1">
                          Commission: {formatRWF(Number(sale.commission_amount))} — Seller: {formatRWF(Number(sale.seller_amount))} — {sale.farmer?.full_name}
                        </p>
                      </div>
                      {sale.status === 'confirmed' && (
                        <button onClick={async () => {
                          await supabase.from('sales').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', sale.id);
                          await logAction('complete_sale', 'sales', sale.id, { amount: sale.sale_amount });
                          loadData();
                        }} className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-medium hover:bg-emerald-200">
                          Mark Completed
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings */}
        {tab === 'settings' && settings && (
          <SettingsPanel settings={settings} adminId={profile?.id || ''} onSaved={loadData} onLog={logAction} />
        )}

        {/* Audit */}
        {tab === 'audit' && (
          <div>
            <h2 className="text-lg font-bold text-stone-800 mb-4">{t('auditLogs')} ({auditLogs.length})</h2>
            {auditLogs.length === 0 ? (
              <EmptyState icon={<ShieldCheck className="h-12 w-12" />} title="No Audit Logs" message="Admin actions will be recorded here." />
            ) : (
              <div className="space-y-2">
                {auditLogs.map(log => (
                  <div key={log.id} className="rounded-lg border border-stone-200 bg-white p-3 flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-600 flex-shrink-0">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800">{log.action} <span className="text-stone-400 font-normal">on {log.entity_type}</span></p>
                      <p className="text-xs text-stone-500">{formatDateTime(log.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Categories Tab ---

function CategoriesTab({ categories, onSaved, onLog }: {
  categories: Category[];
  onSaved: () => void;
  onLog: (action: string, entityType: string, entityId: string | null, details?: Record<string, unknown>) => Promise<void>;
}) {
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const inputClass = 'w-full px-3 py-2.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none';
  const labelClass = 'block text-sm font-medium text-stone-700 mb-1';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-stone-800">{t('manageCategories')} ({categories.length})</h2>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors">
          <Plus className="h-4 w-4" />
          {t('addCategory')}
        </button>
      </div>

      {categories.length === 0 && !showForm ? (
        <EmptyState icon={<Tags className="h-12 w-12" />} title="No Categories" message="Add product categories to help buyers browse." />
      ) : (
        <div className="space-y-2">
          {categories.map(cat => (
            <div key={cat.id} className="rounded-xl border border-stone-200 bg-white p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Tags className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-stone-800">{cat.name_en} <span className="text-stone-400 font-normal">/ {cat.name_rw}</span></p>
                  <p className="text-xs text-stone-500">Icon: {cat.icon} — Sort: {cat.sort_order}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { setEditing(cat); setShowForm(true); }} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={async () => {
                  if (!confirm('Delete this category? Products in it will keep their data but lose the category link.')) return;
                  await supabase.from('categories').delete().eq('id', cat.id);
                  await onLog('delete_category', 'categories', cat.id, { name: cat.name_en });
                  onSaved();
                }} className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <CategoryFormModal
          category={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); onSaved(); }}
          onLog={onLog}
          inputClass={inputClass}
          labelClass={labelClass}
        />
      )}
    </div>
  );
}

function CategoryFormModal({ category, onClose, onSaved, onLog, inputClass, labelClass }: {
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
  onLog: (action: string, entityType: string, entityId: string | null, details?: Record<string, unknown>) => Promise<void>;
  inputClass: string;
  labelClass: string;
}) {
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name_en: category?.name_en || '',
    name_rw: category?.name_rw || '',
    icon: category?.icon || 'Package',
    sort_order: category?.sort_order?.toString() || '0',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (category) {
      await supabase.from('categories').update({
        name_en: form.name_en,
        name_rw: form.name_rw,
        icon: form.icon,
        sort_order: parseInt(form.sort_order) || 0,
      }).eq('id', category.id);
      await onLog('update_category', 'categories', category.id, { name: form.name_en });
    } else {
      const { data } = await supabase.from('categories').insert({
        name_en: form.name_en,
        name_rw: form.name_rw,
        icon: form.icon,
        sort_order: parseInt(form.sort_order) || 0,
      }).select().single();
      if (data) await onLog('create_category', 'categories', data.id, { name: form.name_en });
    }
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-stone-200">
          <h3 className="text-lg font-bold text-stone-800">{category ? t('editCategory') : t('addCategory')}</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:bg-stone-100"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div><label className={labelClass}>{t('categoryNameEn')}</label><input required value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} className={inputClass} /></div>
          <div><label className={labelClass}>{t('categoryNameRw')}</label><input required value={form.name_rw} onChange={e => setForm({ ...form, name_rw: e.target.value })} className={inputClass} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>{t('categoryIcon')}</label><input required value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} className={inputClass} placeholder="Wheat, Package, etc." /></div>
            <div><label className={labelClass}>{t('categorySortOrder')}</label><input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} className={inputClass} /></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-stone-300 text-stone-700 font-medium hover:bg-stone-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Settings Panel ---

function SettingsPanel({ settings, adminId, onSaved, onLog }: {
  settings: PlatformSettings;
  adminId: string;
  onSaved: () => void;
  onLog: (action: string, entityType: string, entityId: string | null, details?: Record<string, unknown>) => Promise<void>;
}) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    promotion_price: settings.promotion_price.toString(),
    promotion_duration_days: settings.promotion_duration_days.toString(),
    commission_rate: (settings.commission_rate * 100).toString(),
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('platform_settings').update({
      promotion_price: parseFloat(form.promotion_price) || 0,
      promotion_duration_days: parseInt(form.promotion_duration_days) || 7,
      commission_rate: (parseFloat(form.commission_rate) || 0) / 100,
      updated_by: adminId,
      updated_at: new Date().toISOString(),
    }).eq('id', settings.id);
    await onLog('update_settings', 'platform_settings', settings.id, { promotion_price: form.promotion_price, commission_rate: form.commission_rate });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSaved();
  };

  const inputClass = 'w-full px-3 py-2.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none';
  const labelClass = 'block text-sm font-medium text-stone-700 mb-1';

  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-bold text-stone-800 mb-4">{t('manageSettings')}</h2>
      <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-stone-200 bg-white p-6">
        <div>
          <label className={labelClass}>{t('promotionPrice')}</label>
          <input type="number" value={form.promotion_price} onChange={e => setForm({ ...form, promotion_price: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>{t('promotionDuration')}</label>
          <input type="number" value={form.promotion_duration_days} onChange={e => setForm({ ...form, promotion_duration_days: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>{t('commissionRateSetting')}</label>
          <input type="number" step="0.1" value={form.commission_rate} onChange={e => setForm({ ...form, commission_rate: e.target.value })} className={inputClass} />
          <p className="text-xs text-stone-400 mt-1">Current: {(settings.commission_rate * 100).toFixed(1)}%</p>
        </div>
        <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50">
          {saved ? <CheckCircle className="h-5 w-5" /> : <Save className="h-5 w-5" />}
          {saved ? 'Saved!' : t('saveSettings')}
        </button>
      </form>
    </div>
  );
}
