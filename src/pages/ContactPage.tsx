import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { PageHeader } from '@/components/PageHeader';
import { MapPin, Phone, Mail, Send, CheckCircle } from 'lucide-react';
import { useDocumentMeta } from '@/lib/use-document-meta';

export function ContactPage() {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useDocumentMeta({
    title: 'Contact Isoko Link — Agricultural Marketplace Support',
    description: t('metaContactDesc'),
    canonicalPath: '/contact',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setName('');
    setEmail('');
    setMessage('');
  };

  return (
    <div>
      <PageHeader title={t('contactUsTitleAlt')} subtitle={t('contactSubtitle')} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact info */}
          <div>
            <h2 className="text-xl font-bold text-stone-800 mb-6">{t('getInTouch')}</h2>
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-700 flex-shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-800">{t('address')}</h3>
                  <p className="text-sm text-stone-600">Gisagara District<br />Southern Province, Rwanda</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 flex-shrink-0">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-800">{t('phone')}</h3>
                  <p className="text-sm text-stone-600">+250 783 286 211</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 flex-shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-800">{t('email')}</h3>
                  <p className="text-sm text-stone-600">info@isokolink.rw</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div>
            {submitted ? (
              <div className="p-8 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
                  <CheckCircle className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-stone-800 mb-2">{t('messageSent')}</h3>
                <p className="text-stone-600 mb-4">{t('messageSentMsg')}</p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  {t('sendAnother')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 rounded-xl border border-stone-200 bg-white shadow-sm">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('yourName')}</label>
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('yourEmail')}</label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('message')}</label>
                    <textarea
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={5}
                      className="w-full px-3 py-2.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
                  >
                    <Send className="h-5 w-5" />
                    {t('send')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
