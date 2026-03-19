import { getDb } from '../db';
import type { BrandType } from '../types';

export function lookupCost(productCode: string, brand: BrandType): number | null {
  const db = getDb();
  const brandType = brand === 'cllink' ? 'parts' : 'maqs';

  // First try the brand-specific sheet
  let result = db.prepare('SELECT cost FROM costs WHERE product_code = ? AND brand_type = ?').get(productCode, brandType) as { cost: number } | undefined;

  // For MAQs, fallback to parts sheet if not found
  if (!result && brandType === 'maqs') {
    result = db.prepare('SELECT cost FROM costs WHERE product_code = ? AND brand_type = ?').get(productCode, 'parts') as { cost: number } | undefined;
  }

  return result ? Math.round(result.cost) : null;
}

function cleanCode(code: string): string {
  return code.replace(/["=]/g, '');
}

export function importCosts(rows: string[][], brandType: 'parts' | 'maqs'): number {
  const db = getDb();
  // Clear existing costs for this brand type
  db.prepare('DELETE FROM costs WHERE brand_type = ?').run(brandType);

  const insert = db.prepare('INSERT INTO costs (product_code, cost, brand_type) VALUES (?, ?, ?)');
  const importMany = db.transaction((data: string[][]) => {
    let count = 0;
    for (const row of data) {
      if (row.length >= 2) {
        const code = cleanCode(row[0]?.trim());
        const cost = parseInt(row[1]?.trim(), 10);
        if (code && !isNaN(cost)) {
          insert.run(code, cost, brandType);
          count++;
        }
      }
    }
    return count;
  });
  return importMany(rows);
}

export function getAllCosts(brandType: 'parts' | 'maqs'): { product_code: string; cost: number }[] {
  const db = getDb();
  return db.prepare('SELECT product_code, cost FROM costs WHERE brand_type = ? ORDER BY product_code').all(brandType) as { product_code: string; cost: number }[];
}

export function getCostCount(brandType?: string): number {
  const db = getDb();
  if (brandType) {
    const result = db.prepare('SELECT COUNT(*) as cnt FROM costs WHERE brand_type = ?').get(brandType) as { cnt: number };
    return result.cnt;
  }
  const result = db.prepare('SELECT COUNT(*) as cnt FROM costs').get() as { cnt: number };
  return result.cnt;
}
