ALTER TABLE consumption_lines ADD COLUMN IF NOT EXISTS is_alcoholic boolean;
UPDATE consumption_lines l SET is_alcoholic = l.is_beverage AND (
 EXISTS (SELECT 1 FROM products p WHERE p.id=l.product_id AND (p.details->>'alcohol'='present' OR p.category='Boissons alcoolisées'))
 OR EXISTS (SELECT 1 FROM audit a WHERE a.reference_id=l.consumption_id AND a.action='free-checkout' AND a.after_data->>'category'='Boissons alcoolisées')
) WHERE l.is_alcoholic IS NULL;
ALTER TABLE patch_campaigns ADD COLUMN IF NOT EXISTS minimum_quantity integer NOT NULL DEFAULT 100 CHECK(minimum_quantity>0);
