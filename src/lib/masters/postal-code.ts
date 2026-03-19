import { getDb } from '../db';
import type { PostalCodeEntry } from '../types';

export function lookupPostalCode(postalCode: string): PostalCodeEntry | null {
  const db = getDb();
  const result = db.prepare('SELECT postal_code as postalCode, prefecture, city FROM postal_codes WHERE postal_code = ?').get(postalCode) as PostalCodeEntry | undefined;
  return result || null;
}

export function importPostalCodes(rows: string[][]): number {
  const db = getDb();
  const upsert = db.prepare(
    'INSERT OR REPLACE INTO postal_codes (postal_code, prefecture, city) VALUES (?, ?, ?)'
  );
  const importMany = db.transaction((data: string[][]) => {
    let count = 0;
    for (const row of data) {
      // KEN_ALL.CSV format: col[2]=postal_code, col[6]=prefecture, col[7]=city
      if (row.length >= 8) {
        const postalCode = row[2]?.trim().replace(/"/g, '');
        const prefecture = row[6]?.trim().replace(/"/g, '');
        const city = row[7]?.trim().replace(/"/g, '');
        if (postalCode && prefecture) {
          upsert.run(postalCode, prefecture, city);
          count++;
        }
      }
    }
    return count;
  });
  return importMany(rows);
}

export function getAllPostalCodes(): { postal_code: string; prefecture: string; city: string }[] {
  const db = getDb();
  return db.prepare('SELECT postal_code, prefecture, city FROM postal_codes ORDER BY postal_code').all() as { postal_code: string; prefecture: string; city: string }[];
}

export function getPostalCodeCount(): number {
  const db = getDb();
  const result = db.prepare('SELECT COUNT(*) as cnt FROM postal_codes').get() as { cnt: number };
  return result.cnt;
}
