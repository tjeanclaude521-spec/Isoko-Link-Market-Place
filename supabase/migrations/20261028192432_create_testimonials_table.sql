/*
# Create testimonials table

1. New Tables
- `testimonials`
  - `id` (uuid, primary key)
  - `name` (text, not null) — farmer's display name
  - `district` (text, not null) — district name
  - `sector` (text) — sector within the district
  - `product_type` (text) — type of product they sell
  - `quote` (text, not null) — their testimonial message
  - `quote_rw` (text) — Kinyarwanda version of the quote
  - `photo_url` (text) — optional profile photo URL
  - `rating` (integer, default 5) — rating from 1-5
  - `is_published` (boolean, default true) — only published testimonials show on the site
  - `sort_order` (integer, default 0) — ordering
  - `created_at` (timestamptz)

2. Security
- Enable RLS on `testimonials`.
- Grant SELECT to `anon` and `authenticated` so all visitors see published testimonials.
- Grant full CRUD to `authenticated` (admin manages testimonials through dashboard).
- Policies: anyone can read published testimonials; only admins can write.

3. Seed Data
- Inserts 3 initial testimonials with farmer names, quotes in English and Kinyarwanda,
  and ratings. These are placeholder testimonials that should be replaced with
  verified real farmer testimonials.
*/

CREATE TABLE IF NOT EXISTS testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  district text NOT NULL DEFAULT 'Gisagara',
  sector text,
  product_type text,
  quote text NOT NULL,
  quote_rw text,
  photo_url text,
  rating integer NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON testimonials TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON testimonials TO authenticated;

-- Public can read published testimonials
DROP POLICY IF EXISTS "testimonials_public_read" ON testimonials;
CREATE POLICY "testimonials_public_read"
  ON testimonials FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

-- Only admins can insert
DROP POLICY IF EXISTS "testimonials_admin_insert" ON testimonials;
CREATE POLICY "testimonials_admin_insert"
  ON testimonials FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Only admins can update
DROP POLICY IF EXISTS "testimonials_admin_update" ON testimonials;
CREATE POLICY "testimonials_admin_update"
  ON testimonials FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Only admins can delete
DROP POLICY IF EXISTS "testimonials_admin_delete" ON testimonials;
CREATE POLICY "testimonials_admin_delete"
  ON testimonials FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Seed initial testimonials
INSERT INTO testimonials (name, district, sector, product_type, quote, quote_rw, rating, sort_order)
VALUES
  (
    'Mukamana Beatrice',
    'Gisagara',
    'Mamba',
    'Vegetables',
    'Isoko Link helped me reach buyers I never could find before. Now I sell my vegetables faster and at better prices. The platform is simple and free to use.',
    'Isoko Link yanafashaga kubona abaguzi ntabwo nahari nabonaga mbere. None ngurisha imboga vuba kandi ku biciro byiza. Urubuga roroshye kandi ruhoraho.',
    5,
    1
  ),
  (
    'Habimana Jean Pierre',
    'Gisagara',
    'Save',
    'Beans and Maize',
    'Before Isoko Link, I struggled to sell my harvest. Now buyers contact me directly on my phone. I have grown my farm and increased my income significantly.',
    'Mbere ya Isoko Link, nari ntebe yo kugurisha umusaruro wanjye. None abaguzi banvugana ku mbugama. Nongereye ubuhinzi bwanjye nongoye amafaranga menshi.',
    5,
    2
  ),
  (
    'Uwase Claudine',
    'Gisagara',
    'Gishubi',
    'Coffee',
    'Listing my coffee on Isoko Link was the best decision. I connected with buyers across the district. The 1% commission is fair and transparent — no hidden fees.',
    'Gushyira ikawa yanjye kuri Isoko Link byari umugamingo mwiza. Nahuye n''abaguzi bo mu karere kwose. Imigabane ya 1% ni abonerana nta mafaranga ihishe.',
    5,
    3
  )
ON CONFLICT DO NOTHING;
