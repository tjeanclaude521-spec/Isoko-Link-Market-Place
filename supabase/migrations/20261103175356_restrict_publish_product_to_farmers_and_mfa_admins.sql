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