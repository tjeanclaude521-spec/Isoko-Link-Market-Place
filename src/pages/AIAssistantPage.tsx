import { AIAssistant } from '@/components/AIAssistant';
import { PageHeader } from '@/components/PageHeader';
import { useLanguage } from '@/context/LanguageContext';
import { Bot } from 'lucide-react';
import { useDocumentMeta } from '@/lib/use-document-meta';

export function AIAssistantPage() {
  const { t } = useLanguage();

  useDocumentMeta({
    title: 'AI Agricultural Assistant — Isoko Link',
    description: t('metaAssistantDesc'),
    canonicalPath: '/assistant',
  });

  return (
    <div>
      <PageHeader
        title={t('aiAssistantHeading')}
        breadcrumbs={[
          { label: t('home'), to: '/' },
          { label: t('aiAssistantShort') },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto mb-6 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-100 mb-4">
            <Bot className="h-7 w-7 text-emerald-700" />
          </div>
          <h2 className="text-xl font-bold text-stone-800 mb-2">{t('aiAssistantTitle')}</h2>
          <p className="text-stone-500 text-sm">{t('aiAssistantSubtitle')}</p>
        </div>

        <AIAssistant />
      </div>
    </div>
  );
}
