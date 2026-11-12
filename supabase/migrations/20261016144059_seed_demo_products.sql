-- Insert demo products so the marketplace isn't empty on first view.
-- These are clearly labeled with "Demo:" prefix and use a fixed demo farmer profile.
-- A demo farmer profile is created first if one doesn't exist yet.

-- Create a demo farmer using an existing farmer ID
DO $$
DECLARE
  demo_farmer_id uuid;
  cat_cereals uuid := '31a5e676-a96c-4022-893f-dce81e32a23f';
  cat_legumes uuid := '0090a045-273d-4a30-a2b3-9ffe67681632';
  cat_vegetables uuid := '4137b34f-f75c-44e4-a85b-b86f0c9945b8';
  cat_fruits uuid := 'e7b42027-bf36-4c94-8b14-43f00f00c2af';
  cat_tubers uuid := 'db28fd1f-375e-489c-9b71-7c8b97ffee94';
  cat_cash uuid := 'deb0501d-7b09-4291-93bb-40c385e64979';
BEGIN
  -- Use the first farmer profile we find
  SELECT id INTO demo_farmer_id FROM profiles WHERE role = 'farmer' ORDER BY created_at LIMIT 1;

  IF demo_farmer_id IS NULL THEN
    RAISE NOTICE 'No farmer profile found — skipping demo product seed';
    RETURN;
  END IF;

  -- Only insert if no demo products exist yet
  IF NOT EXISTS (SELECT 1 FROM products WHERE name LIKE 'Demo:%') THEN
    -- Cereals
    INSERT INTO products (farmer_id, category_id, name, description, price, unit, quantity_available, district, sector, village, contact_phone, contact_whatsapp, status, image_url)
    VALUES
    (demo_farmer_id, cat_cereals, 'Demo: White Rice (Umuceri)', 'High-quality white rice grown in the marshlands of Gisagara. Cleaned and ready for cooking.', 1200, 'kg', 500, 'Gisagara', 'Mamba', 'Ruga', '+250788000001', '+250788000001', 'active', 'https://images.pexels.com/photos/29797010/pexels-photo-29797010.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
    (demo_farmer_id, cat_cereals, 'Demo: Maize (Ibigori)', 'Dried yellow maize, perfect for milling into flour. Harvested this season.', 800, 'kg', 1000, 'Gisagara', 'Save', 'Gitanga', '+250788000001', '+250788000001', 'active', 'https://images.pexels.com/photos/29798198/pexels-photo-29798198.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),

    -- Legumes
    (demo_farmer_id, cat_legumes, 'Demo: Kidney Beans (Ibishyimbo)', 'Red kidney beans, a staple in Rwandan cuisine. Sorted and clean.', 900, 'kg', 300, 'Gisagara', 'Gishubi', 'Kibayi', '+250788000002', '+250788000002', 'active', 'https://images.pexels.com/photos/33068285/pexels-photo-33068285.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
    (demo_farmer_id, cat_legumes, 'Demo: Soybeans (Soya)', 'Dried soybeans, high in protein. Suitable for making soymilk and animal feed.', 750, 'kg', 200, 'Gisagara', 'Muganza', 'Muganza', '+250788000002', '+250788000002', 'active', 'https://images.pexels.com/photos/34448993/pexels-photo-34448993.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),

    -- Vegetables
    (demo_farmer_id, cat_vegetables, 'Demo: Fresh Tomatoes (Inyanya)', 'Ripe red tomatoes freshly picked from the garden. Perfect for cooking and salads.', 500, 'kg', 150, 'Gisagara', 'Mamba', 'Ruga', '+250788000003', '+250788000003', 'active', 'https://images.pexels.com/photos/34635764/pexels-photo-34635764.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),

    -- Fruits
    (demo_farmer_id, cat_fruits, 'Demo: Bananas (Imineke)', 'Sweet ripe bananas from local gardens. Sold by the bunch.', 400, 'piece', 100, 'Gisagara', 'Save', 'Gitanga', '+250788000003', '+250788000003', 'active', 'https://images.pexels.com/photos/30893281/pexels-photo-30893281.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),

    -- Tubers
    (demo_farmer_id, cat_tubers, 'Demo: Sweet Potatoes (Ibijumba)', 'Freshly harvested sweet potatoes. Great for roasting and boiling.', 600, 'kg', 400, 'Gisagara', 'Gishubi', 'Kibayi', '+250788000004', '+250788000004', 'active', 'https://images.pexels.com/photos/5199274/pexels-photo-5199274.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
    (demo_farmer_id, cat_tubers, 'Demo: Cassava (Imyumbati)', 'Cassava roots, ready for processing into flour or direct cooking.', 500, 'kg', 600, 'Gisagara', 'Muganza', 'Muganza', '+250788000004', '+250788000004', 'active', 'https://images.pexels.com/photos/7543161/pexels-photo-7543161.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),

    -- Cash Crops
    (demo_farmer_id, cat_cash, 'Demo: Coffee Beans (Ikawa)', 'Arabica coffee beans, sun-dried and ready for roasting. Grown in the hills of Gisagara.', 2500, 'kg', 100, 'Gisagara', 'Save', 'Gitanga', '+250788000005', '+250788000005', 'active', 'https://images.pexels.com/photos/30444143/pexels-photo-30444143.jpeg?auto=compress&cs=tinysrgb&h=650&w=940');

    RAISE NOTICE 'Demo products inserted successfully';
  ELSE
    RAISE NOTICE 'Demo products already exist — skipping';
  END IF;
END $$;
