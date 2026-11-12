CREATE OR REPLACE FUNCTION public.publish_product(p_name text, p_description text DEFAULT ''::text, p_price numeric DEFAULT 0, p_unit text DEFAULT 'kg'::text, p_quantity_available numeric DEFAULT 0, p_category_id uuid DEFAULT NULL::uuid, p_district text DEFAULT 'Gisagara'::text, p_sector text DEFAULT ''::text, p_village text DEFAULT ''::text, p_contact_phone text DEFAULT ''::text, p_contact_whatsapp text DEFAULT ''::text, p_image_url text DEFAULT ''::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
v_farmer_id uuid := auth.uid();
v_profile_phone text;
v_product_id uuid;
BEGIN
IF v_farmer_id IS NULL THEN
RAISE EXCEPTION 'You must be signed in to publish a product.';
END IF;

IF NOT (
  EXISTS (SELECT 1 FROM profiles WHERE id = v_farmer_id AND role = 'farmer')
  OR public.is_admin_mfa()
) THEN
RAISE EXCEPTION 'Only farmers can publish products.';
END IF;

SELECT phone INTO v_profile_phone FROM profiles WHERE id = v_farmer_id;

IF v_profile_phone IS NULL OR v_profile_phone = '' OR NOT public.validate_rwanda_phone(v_profile_phone) THEN
RAISE EXCEPTION 'Please complete your profile with a valid Rwanda phone number (+250XXXXXXXXX) before publishing products.';
END IF;

IF char_length(btrim(coalesce(p_name, ''))) NOT BETWEEN 1 AND 120 THEN
RAISE EXCEPTION 'Product name is required and must be at most 120 characters.';
END IF;

IF char_length(btrim(coalesce(p_description, ''))) NOT BETWEEN 1 AND 2000 THEN
RAISE EXCEPTION 'Product description is required and must be at most 2000 characters.';
END IF;

IF p_price IS NULL OR p_price <= 0 OR p_price > 10000000 THEN
RAISE EXCEPTION 'Price must be greater than 0 and at most 10,000,000.';
END IF;

IF p_unit IS NULL OR p_unit NOT IN ('kg', 'sack', 'basket', 'tonne', 'piece', 'litre', 'dozen') THEN
RAISE EXCEPTION 'Please choose a valid unit.';
END IF;

IF p_quantity_available IS NULL OR p_quantity_available < 0 OR p_quantity_available > 1000000 THEN
RAISE EXCEPTION 'Quantity cannot be negative and must be at most 1,000,000.';
END IF;

IF p_category_id IS NULL OR NOT EXISTS (SELECT 1 FROM categories WHERE id = p_category_id) THEN
RAISE EXCEPTION 'Please choose a valid category.';
END IF;

IF char_length(btrim(coalesce(p_district, ''))) NOT BETWEEN 1 AND 100
  OR char_length(btrim(coalesce(p_sector, ''))) NOT BETWEEN 1 AND 100
  OR char_length(btrim(coalesce(p_village, ''))) NOT BETWEEN 1 AND 100 THEN
RAISE EXCEPTION 'District, sector and village are required and must be at most 100 characters each.';
END IF;

IF char_length(coalesce(p_contact_phone, '')) > 20
  OR (btrim(coalesce(p_contact_phone, '')) <> '' AND NOT public.validate_rwanda_phone(p_contact_phone)) THEN
RAISE EXCEPTION 'Contact phone must be a valid Rwanda number (+250XXXXXXXXX) or left empty.';
END IF;

IF char_length(coalesce(p_contact_whatsapp, '')) > 20
  OR (btrim(coalesce(p_contact_whatsapp, '')) <> '' AND NOT public.validate_rwanda_phone(p_contact_whatsapp)) THEN
RAISE EXCEPTION 'WhatsApp number must be a valid Rwanda number (+250XXXXXXXXX) or left empty.';
END IF;

IF char_length(coalesce(p_image_url, '')) > 2048
  OR (coalesce(p_image_url, '') <> '' AND p_image_url NOT LIKE 'https://%') THEN
RAISE EXCEPTION 'Product image link is invalid.';
END IF;

INSERT INTO products (
farmer_id, name, description, price, unit, quantity_available,
category_id, district, sector, village, contact_phone, contact_whatsapp,
image_url, status
) VALUES (
v_farmer_id, p_name, p_description, p_price, p_unit, p_quantity_available,
p_category_id, p_district, p_sector, p_village,
COALESCE(NULLIF(p_contact_phone, ''), v_profile_phone),
p_contact_whatsapp, p_image_url, 'active'
)
RETURNING id INTO v_product_id;

RETURN v_product_id;
END;
$function$;

ALTER TABLE public.products
  ADD CONSTRAINT products_price_range CHECK (price > 0 AND price <= 10000000) NOT VALID,
  ADD CONSTRAINT products_quantity_range CHECK (quantity_available >= 0 AND quantity_available <= 1000000) NOT VALID,
  ADD CONSTRAINT products_name_length CHECK (char_length(btrim(name)) BETWEEN 1 AND 120) NOT VALID,
  ADD CONSTRAINT products_description_required CHECK (char_length(btrim(coalesce(description, ''))) BETWEEN 1 AND 2000) NOT VALID,
  ADD CONSTRAINT products_unit_allowed CHECK (unit IN ('kg', 'sack', 'basket', 'tonne', 'piece', 'litre', 'dozen')) NOT VALID,
  ADD CONSTRAINT products_category_required CHECK (category_id IS NOT NULL) NOT VALID,
  ADD CONSTRAINT products_location_required CHECK (
    char_length(btrim(coalesce(district, ''))) BETWEEN 1 AND 100
    AND char_length(btrim(coalesce(sector, ''))) BETWEEN 1 AND 100
    AND char_length(btrim(coalesce(village, ''))) BETWEEN 1 AND 100
  ) NOT VALID,
  ADD CONSTRAINT products_contact_length CHECK (
    char_length(coalesce(contact_phone, '')) <= 20
    AND char_length(coalesce(contact_whatsapp, '')) <= 20
  ) NOT VALID,
  ADD CONSTRAINT products_image_url_valid CHECK (
    char_length(coalesce(image_url, '')) <= 2048
    AND (coalesce(image_url, '') = '' OR image_url LIKE 'https://%')
  ) NOT VALID;