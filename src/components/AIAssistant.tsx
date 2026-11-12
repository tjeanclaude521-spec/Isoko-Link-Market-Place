import { useState, useRef, useEffect } from 'react';
import {
  Bot, Send, BookOpen, Languages, Calculator, Lightbulb, Package,
  AlertCircle, Sparkles, Loader2, Trash2,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { callAssistant, type AssistantAction, type ProductContext } from '@/lib/ai-assistant';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  source?: 'ai' | 'glossary';
  message?: string;
}

interface AIAssistantProps {
  productContext?: ProductContext;
  compact?: boolean;
}

type Tab = 'term' | 'translate' | 'product' | 'tips' | 'calc';

const QUICK_TERMS = [
  'wholesale', 'retail', 'harvest', 'yield', 'fertilizer', 'quantity', 'commission',
  'organic', 'irrigation', 'cooperative', 'pesticide', 'compost',
];

const QUICK_PHRASES = [
  'how much is this', 'i want to buy', 'what is the price', 'is it available',
  'good quality', 'do you deliver', 'where are you located', 'can i get a discount',
];

export function AIAssistant({ productContext, compact }: AIAssistantProps) {
  const { t, lang } = useLanguage();
  const [tab, setTab] = useState<Tab>(productContext ? 'product' : 'term');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [calcPrice, setCalcPrice] = useState('');
  const [calcQty, setCalcQty] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async (action: AssistantAction, data?: Record<string, unknown>, displayText?: string) => {
    setLoading(true);
    const userMsg: Message = { role: 'user', text: displayText || input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    const result = await callAssistant(action, lang, data);
    setMessages((prev) => [...prev, {
      role: 'assistant',
      text: result.response,
      source: result.source,
      message: result.message,
    }]);
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    if (tab === 'term') {
      send('explain_term', { term: input.trim() }, input.trim());
    } else if (tab === 'translate') {
      send('translate', { phrase: input.trim() }, input.trim());
    }
  };

  const handleExplainProduct = () => {
    if (!productContext) return;
    send('explain_product', { product: productContext }, t('aiExplainProduct'));
  };

  const handleTips = () => {
    send('listing_tips', {}, t('aiSellerGuide'));
  };

  const handleCalc = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(calcPrice);
    const qty = parseFloat(calcQty);
    if (isNaN(price) || isNaN(qty) || price < 0 || qty < 0) return;
    send('price_calc', { calc: { pricePerUnit: price, quantity: qty } }, `RWF ${price} × ${qty}`);
  };

  const showTextInput = tab === 'term' || tab === 'translate';

  const tabs: { key: Tab; label: string; icon: typeof Bot; show: boolean }[] = [
    { key: 'term', label: t('aiExplainTerm'), icon: BookOpen, show: true },
    { key: 'translate', label: t('aiTranslate'), icon: Languages, show: true },
    { key: 'product', label: t('aiExplainProduct'), icon: Package, show: !!productContext },
    { key: 'tips', label: t('aiSellerGuide'), icon: Lightbulb, show: true },
    { key: 'calc', label: t('aiPriceCalc'), icon: Calculator, show: true },
  ];

  return (
    <div className={`bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden ${compact ? '' : 'max-w-2xl mx-auto'}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 px-5 py-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-white text-sm">{t('aiAssistantTitle')}</h3>
          <p className="text-emerald-100 text-xs">{t('aiAssistantSubtitle')}</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-emerald-100 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title={t('aiClearChat')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-3 pt-3 border-b border-stone-100 overflow-x-auto">
        {tabs.filter((tb) => tb.show).map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-medium whitespace-nowrap transition-colors ${
              tab === tb.key
                ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
            }`}
          >
            <tb.icon className="h-3.5 w-3.5" />
            {tb.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      {messages.length > 0 && (
        <div ref={scrollRef} className="max-h-80 overflow-y-auto px-4 py-4 space-y-3 bg-stone-50">
          {messages.map((msg, i) => (
            <div key={i} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-stone-200 text-stone-700'
              }`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="h-3 w-3 text-emerald-600" />
                    {msg.source === 'ai' ? (
                      <span className="text-xs font-medium text-emerald-600">{t('aiAIMode')}</span>
                    ) : (
                      <span className="text-xs font-medium text-stone-400">{t('aiGlossaryMode')}</span>
                    )}
                  </div>
                )}
                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                {msg.message && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {msg.message}
                  </p>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-stone-200 rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm text-stone-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('aiThinking')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action area */}
      <div className="p-4">
        {showTextInput ? (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={tab === 'term' ? t('aiEnterTerm') : t('aiEnterPhrase')}
              className="flex-1 px-3 py-2.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {t('aiSend')}
            </button>
          </form>
        ) : tab === 'product' && productContext ? (
          <button
            onClick={handleExplainProduct}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <Package className="h-4 w-4" />
            {t('aiExplainProduct')}
          </button>
        ) : tab === 'tips' ? (
          <button
            onClick={handleTips}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <Lightbulb className="h-4 w-4" />
            {t('aiSellerGuide')}
          </button>
        ) : tab === 'calc' ? (
          <form onSubmit={handleCalc} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">{t('aiPricePerUnit')}</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={calcPrice}
                  onChange={(e) => setCalcPrice(e.target.value)}
                  placeholder="500"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">{t('aiQuantity')}</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={calcQty}
                  onChange={(e) => setCalcQty(e.target.value)}
                  placeholder="10"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !calcPrice || !calcQty}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <Calculator className="h-4 w-4" />
              {t('aiCalculate')}
            </button>
          </form>
        ) : null}

        {/* Quick chips — suggestions only, any term can be typed */}
        {tab === 'term' && messages.length === 0 && (
          <div className="mt-3">
            <p className="text-xs text-stone-400 mb-1.5">{t('aiQuickTerms')} — {lang === 'rw' ? 'cyangwa andika iryawe' : 'or type your own'}:</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TERMS.map((term) => (
                <button
                  key={term}
                  onClick={() => send('explain_term', { term }, term)}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-xs hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'translate' && messages.length === 0 && (
          <div className="mt-3">
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PHRASES.map((phrase) => (
                <button
                  key={phrase}
                  onClick={() => send('translate', { phrase }, phrase)}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-xs hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                >
                  {phrase}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="px-4 pb-3">
        <p className="text-xs text-stone-400 flex items-start gap-1">
          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          {t('aiDisclaimer')}
        </p>
      </div>
    </div>
  );
}
