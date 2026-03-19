import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const isVercel = process.env.VERCEL === '1';
const DB_DIR = isVercel ? '/tmp' : path.join(process.cwd(), 'src', 'data');
const DB_PATH = path.join(DB_DIR, 'db.sqlite');

let db: Database.Database | null = null;

export function recordImport(category: string, fileName: string, recordCount: number) {
  const db = getDb();
  db.prepare(
    'INSERT INTO import_history (category, file_name, record_count) VALUES (?, ?, ?)'
  ).run(category, fileName, recordCount);
}

export function getDb(): Database.Database {
  if (db) return db;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initTables(db);
  return db;
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      old_code TEXT NOT NULL,
      new_code TEXT NOT NULL,
      product_name TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_product_codes_old ON product_codes(old_code);

    CREATE TABLE IF NOT EXISTS payment_methods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      old_name TEXT NOT NULL,
      new_name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_payment_methods_old ON payment_methods(old_name);

    CREATE TABLE IF NOT EXISTS postal_codes (
      postal_code TEXT PRIMARY KEY,
      prefecture TEXT NOT NULL,
      city TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS costs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_code TEXT NOT NULL,
      cost INTEGER NOT NULL,
      brand_type TEXT NOT NULL CHECK(brand_type IN ('parts', 'maqs'))
    );

    CREATE INDEX IF NOT EXISTS idx_costs_code_brand ON costs(product_code, brand_type);

    CREATE TABLE IF NOT EXISTS import_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      file_name TEXT NOT NULL,
      record_count INTEGER NOT NULL DEFAULT 0,
      imported_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Insert default payment method mappings if empty
  const count = db.prepare('SELECT COUNT(*) as cnt FROM payment_methods').get() as { cnt: number };
  if (count.cnt === 0) {
    const insert = db.prepare('INSERT INTO payment_methods (old_name, new_name) VALUES (?, ?)');
    const defaults = [
      ['クレジットカード決済', 'クレジットカード'],
      ['ショッピングクレジット／ローン（ジャックス）', 'ショッピングクレジット／ローン'],
      ['銀行振込（前払い）', '銀行振込'],
      ['後払い決済', '後払い決済（Paid）'],
      ['PayPay残高払い', 'PayPay（残高）'],
      ['PayPay（クレジット）※旧あと払い', 'PayPayあと払い'],
      ['商品代引', '代金引換'],
      ['PayPay（クレジット）', 'PayPayクレジット'],
      ['PayPay（残高）', 'PayPay残高等'],
      ['PayPay（残高）等', 'PayPay残高等'],
      ['PayPayあと払い', 'PayPayクレジット'],
    ];
    const insertMany = db.transaction((rows: string[][]) => {
      for (const row of rows) {
        insert.run(row[0], row[1]);
      }
    });
    insertMany(defaults);
  }
}
