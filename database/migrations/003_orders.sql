CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  package_code TEXT NOT NULL,
  amount INTEGER NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  referral_code TEXT,
  payment_provider TEXT,
  payment_reference TEXT,
  payment_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id)
);

CREATE INDEX IF NOT EXISTS idx_orders_site ON orders(site_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_reference ON orders(payment_reference);

ALTER TABLE referrals ADD COLUMN order_id TEXT;
CREATE INDEX IF NOT EXISTS idx_referrals_order ON referrals(order_id);
