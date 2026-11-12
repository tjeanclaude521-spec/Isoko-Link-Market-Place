import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { StatCard } from '@/components/StatCard';
import { SignOutButton } from '@/components/SignOutButton';
import { Loading, EmptyState } from '@/components/Feedback';
import { formatRWF, formatDate } from '@/lib/format';
import { MessageSquare, DollarSign, Package, Search, Phone, MessageCircle, ChevronRight } from 'lucide-react';
import type { Enquiry, Sale } from '@/lib/types';

export function BuyerDashboard() {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [enqRes, saleRes] = await Promise.all([
      supabase.from('enquiries').select(`*, product:products(*)`).eq('buyer_id', user.id).order('created_at', { ascending: false }),
      supabase.from('sales').select(`*, product:products(*)`).eq('buyer_id', user.id).order('created_at', { ascending: false }),
    ]);
    setEnquiries((enqRes.data || []) as Enquiry[]);
    setSales((saleRes.data || []) as Sale[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <Loading fullScreen text="Loading your dashboard..." />;

  const newEnquiries = enquiries.filter(e => e.status === 'new');
  const convertedEnquiries = enquiries.filter(e => e.status === 'converted');
  const confirmedSales = sales.filter(s => s.status === 'confirmed' || s.status === 'completed');

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{t('buyerDashboard')}</h1>
            <p className="text-blue-100 mt-1">{profile?.full_name}</p>
          </div>
          <SignOutButton />
        </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label={t('buyerEnquiries')} value={enquiries.length} icon={MessageSquare} color="blue" hint={`${newEnquiries.length} new`} />
          <StatCard label="Converted" value={convertedEnquiries.length} icon={Package} color="emerald" />
          <StatCard label="Confirmed Sales" value={confirmedSales.length} icon={DollarSign} color="teal" />
          <StatCard label="Total Spent" value={formatRWF(confirmedSales.reduce((s, x) => s + Number(x.sale_amount), 0))} icon={DollarSign} color="amber" />
        </div>

        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-emerald-800">Find Products</h3>
            <p className="text-sm text-emerald-600">Browse the marketplace to find fresh produce from local farmers.</p>
          </div>
          <Link to="/browse" className="flex items-center gap-1 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
            <Search className="h-4 w-4" />
            {t('browseProducts')}
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Enquiries */}
          <div>
            <h2 className="text-lg font-bold text-stone-800 mb-3">{t('buyerEnquiries')}</h2>
            {enquiries.length === 0 ? (
              <EmptyState icon={<MessageSquare className="h-12 w-12" />} title="No Enquiries" message="When you contact farmers about their products, your enquiries will appear here." />
            ) : (
              <div className="space-y-3">
                {enquiries.slice(0, 20).map(enq => (
                  <div key={enq.id} className="rounded-xl border border-stone-200 bg-white p-4">
                    <Link to={`/product/${enq.product_id}`} className="flex items-center justify-between group">
                      <div>
                        <h3 className="font-semibold text-stone-800 group-hover:text-emerald-700">{enq.product?.name}</h3>
                        <p className="text-xs text-stone-500">{formatDate(enq.created_at)} — Ref: {enq.reference}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-emerald-600" />
                    </Link>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        enq.status === 'new' ? 'bg-blue-100 text-blue-700' :
                        enq.status === 'contacted' ? 'bg-amber-100 text-amber-700' :
                        enq.status === 'converted' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-stone-100 text-stone-500'
                      }`}>{enq.status}</span>
                    </div>

                    {/* Seller contact options */}
                    {enq.product && (enq.product.contact_phone || enq.product.contact_whatsapp) && (
                      <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap gap-2">
                        {enq.product.contact_phone && (
                          <a href={`tel:${enq.product.contact_phone}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors">
                            <Phone className="h-3.5 w-3.5" />
                            {t('callNow')}
                          </a>
                        )}
                        {enq.product.contact_whatsapp && (
                          <a href={`https://wa.me/${enq.product.contact_whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100 transition-colors">
                            <MessageCircle className="h-3.5 w-3.5" />
                            {t('whatsapp')}
                          </a>
                        )}
                        <Link to={`/product/${enq.product_id}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-50 text-stone-700 text-sm font-medium hover:bg-stone-100 transition-colors">
                          <Package className="h-3.5 w-3.5" />
                          {t('contactFarmer')}
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sales */}
          <div>
            <h2 className="text-lg font-bold text-stone-800 mb-3">Purchase History</h2>
            {sales.length === 0 ? (
              <EmptyState icon={<DollarSign className="h-12 w-12" />} title="No Purchases" message="Confirmed purchases will be tracked here." />
            ) : (
              <div className="space-y-3">
                {sales.map(sale => (
                  <div key={sale.id} className="rounded-xl border border-stone-200 bg-white p-4">
                    <h3 className="font-semibold text-stone-800">{sale.product?.name}</h3>
                    <p className="text-sm text-stone-500">{formatRWF(Number(sale.sale_amount))} — {sale.quantity_sold} {sale.unit} — {formatDate(sale.created_at)}</p>
                    <span className={`mt-2 inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                      sale.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      sale.status === 'confirmed' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>{sale.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
