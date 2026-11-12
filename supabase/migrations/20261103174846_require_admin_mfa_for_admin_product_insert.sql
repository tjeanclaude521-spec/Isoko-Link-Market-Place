ALTER POLICY products_farmer_insert ON public.products
  WITH CHECK (
    auth.uid() = farmer_id
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'farmer'
      )
      OR public.is_admin_mfa()
    )
  );