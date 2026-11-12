/*
# Security hardening: sales ownership + buyer write restriction

## Problems
1. sales INSERT policy only checked auth.uid() = farmer_id on the sale
   row, NOT that the product being sold actually belongs to that farmer.
   A farmer could insert a sale referencing another farmer's product_id.
2. sales UPDATE policy allowed the buyer of a sale to update ANY field,
   including status. Buyers have no sales-management UI in the app, so
   this was an unintended write path that could let a buyer mark a sale
   completed or alter amounts.

## Fixes
1. sales INSERT now requires the referenced product to be owned by the
   caller (OR admin).
2. sales UPDATE restricted to farmer + admin. Buyer can still READ
   their own sales (SELECT policy unchanged).
*/

-- 1. Tighten sales INSERT: caller must own the product being sold
DROP POLICY IF EXISTS "sales_farmer_insert" ON sales;
CREATE POLICY "sales_farmer_insert" ON sales FOR INSERT TO authenticated WITH CHECK (
  (
    auth.uid() = farmer_id
    AND EXISTS (SELECT 1 FROM products WHERE products.id = product_id AND products.farmer_id = auth.uid())
  )
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- 2. Restrict sales UPDATE to farmer + admin (remove buyer write path)
DROP POLICY IF EXISTS "sales_owner_or_admin_update" ON sales;
CREATE POLICY "sales_owner_or_admin_update" ON sales FOR UPDATE TO authenticated USING (
  auth.uid() = farmer_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  auth.uid() = farmer_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);