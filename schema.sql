PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS comics (
  id TEXT PRIMARY KEY,
  preview_token TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  slug TEXT UNIQUE,
  caption TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  source_phone TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS comic_media (
  id TEXT PRIMARY KEY,
  comic_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  alt_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (comic_id) REFERENCES comics(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comics_status_published
  ON comics(status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_comics_phone_status_updated
  ON comics(source_phone, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_comic_media_comic_order
  ON comic_media(comic_id, sort_order ASC);
