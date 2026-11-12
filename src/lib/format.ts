export function formatRWF(amount: number): string {
  return 'RWF ' + new Intl.NumberFormat('en-RW').format(Math.round(amount));
}

export function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function daysUntil(date: string | null): number {
  if (!date) return 0;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isPromotionActive(prom: { start_date: string | null; end_date: string | null; payment_status: string }): boolean {
  if (prom.payment_status !== 'paid' || !prom.start_date || !prom.end_date) return false;
  return new Date(prom.end_date) > new Date();
}
