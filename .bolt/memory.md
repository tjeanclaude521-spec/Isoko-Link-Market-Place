# Project memory

## Product intent & audience

- Agricultural marketplace platform for Rwanda (Gisagara region).
- Connects farmers, buyers, and sellers.
- Bilingual: English and Kinyarwanda with full UI translation support.
- Includes an AI Agricultural Assistant feature at `/assistant`.

## Brand personality & voice

- Welcoming, production-quality, community-oriented.
- Avoids cookie-cutter templates; design should feel distinctive and polished.
- Kinyarwanda copy is first-class — refined, not machine-literal.

## Visual design & UX direction

- **Stack**: Vite + React (JSX), Tailwind CSS, Lucide React icons.
- **Icons**: Use Lucide React for all icons including logos and placeholders (e.g., `Sprout` replaces emoji placeholders); `aria-hidden="true"` for decorative icons.
- **Imports**: Use `@/` path alias (maps to `src/`), never deep relative paths.
- **Images**: Include `width`/`height` attributes; lazy-load below-the-fold images.
- **Homepage section order**: Hero → Quick Links → Categories → Featured Products → Latest Products → How It Works → Features & Benefits → Testimonials → Sell CTA.
- **Quick Links**: Browse, Sell, Featured, AI Assistant (replaced earlier "Search Products" duplicate).
- **Empty states**: Rich, welcoming messages with visible Sell buttons for featured/latest product sections.
- **Conditional content**: Hide stats row when zero products exist.
- **Accessibility**: HTML `lang` attribute updates dynamically on language switch.

## Decisions, constraints & rationale

- Do not install additional UI theme or icon packages — use only template defaults (Tailwind, Lucide React) unless explicitly requested.
- Translation keys centralized in `src/lib/translations.ts`; both languages maintained in lockstep.
- Language state managed via `src/context/LanguageContext.tsx`.
- Build and `tsc --noEmit` must both pass cleanly before declaring work done.

## Open questions & assumptions

- No backend/API details known; product data source and persistence approach unconfirmed.
- AI Assistant implementation details (API, capabilities) not yet explored.
- Auth/login flow exists but implementation details not yet captured.
- Marketplace listing creation (Sell flow) exists but details not yet explored.