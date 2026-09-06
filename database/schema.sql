PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS templates (id TEXT PRIMARY KEY,name TEXT NOT NULL,slug TEXT NOT NULL UNIQUE,description TEXT,preview_image TEXT,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS sites (id TEXT PRIMARY KEY,slug TEXT NOT NULL UNIQUE,business_name TEXT NOT NULL,tagline TEXT,description TEXT,whatsapp TEXT,city TEXT,address TEXT,content_json TEXT NOT NULL DEFAULT '{}',template_id TEXT NOT NULL,package_code TEXT NOT NULL DEFAULT 'basic',status TEXT NOT NULL DEFAULT 'draft',custom_domain TEXT UNIQUE,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY (template_id) REFERENCES templates(id));
CREATE TABLE IF NOT EXISTS packages (id TEXT PRIMARY KEY,code TEXT NOT NULL UNIQUE,name TEXT NOT NULL,price INTEGER NOT NULL,active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS referrals (id TEXT PRIMARY KEY,referral_code TEXT NOT NULL,referred_site_id TEXT NOT NULL,reward INTEGER NOT NULL DEFAULT 25000,status TEXT NOT NULL DEFAULT 'pending',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY (referred_site_id) REFERENCES sites(id));
CREATE INDEX IF NOT EXISTS idx_sites_slug ON sites(slug);CREATE INDEX IF NOT EXISTS idx_sites_status ON sites(status);CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
INSERT OR IGNORE INTO templates (id,name,slug,description) VALUES ('tpl_umkm_modern','UMKM Modern','umkm-modern','Template modern untuk UMKM dan bisnis lokal.');
INSERT OR IGNORE INTO templates (id,name,slug,description) VALUES ('tpl_umkm_katalog','UMKM Katalog','umkm-katalog','Template katalog sederhana dengan fokus produk dan WhatsApp.');
INSERT OR IGNORE INTO packages (id,code,name,price) VALUES ('pkg_15','starter','Starter',15000),('pkg_25','growth','Growth',25000),('pkg_45','business','Business',45000),('pkg_85','pro','Pro',85000);
