import { useEffect } from 'react';

interface DocumentMeta {
  title?: string;
  description?: string;
  canonicalPath?: string;
}

export const SITE_ORIGIN = 'https://isoko-link-agricultu-llbz.bolt.host';

export function ensureMetaTag(name: string, content: string) {
  let el = document.head.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function ensureOGTag(property: string, content: string) {
  let el = document.head.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function ensureCanonical(href: string) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function useDocumentMeta({ title, description, canonicalPath }: DocumentMeta) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      ensureMetaTag('description', description);
      ensureOGTag('og:description', description);
    }
    if (title) ensureOGTag('og:title', title);
    if (canonicalPath) {
      ensureCanonical(`${SITE_ORIGIN}${canonicalPath}`);
    }
  }, [title, description, canonicalPath]);
}

export function useJsonLd(data: object | object[]) {
  useEffect(() => {
    const existing = document.getElementById('page-jsonld');
    if (existing) existing.remove();
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'page-jsonld';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
    return () => {
      const el = document.getElementById('page-jsonld');
      if (el) el.remove();
    };
  }, [JSON.stringify(data)]);
}
