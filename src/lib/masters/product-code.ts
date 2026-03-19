import { getDb } from '../db';
import type { ProductCodeMapping } from '../types';

export function getAllProductCodes(): ProductCodeMapping[] {
  const db = getDb();
  return db.prepare('SELECT id, old_code as oldCode, new_code as newCode, product_name as productName FROM product_codes ORDER BY id').all() as ProductCodeMapping[];
}

export function searchProductCodes(query: string): ProductCodeMapping[] {
  const db = getDb();
  return db.prepare(
    'SELECT id, old_code as oldCode, new_code as newCode, product_name as productName FROM product_codes WHERE old_code LIKE ? OR new_code LIKE ? OR product_name LIKE ? ORDER BY id'
  ).all(`%${query}%`, `%${query}%`, `%${query}%`) as ProductCodeMapping[];
}

function cleanCode(code: string): string {
  return code.replace(/["=]/g, '');
}

export function addProductCode(mapping: ProductCodeMapping): void {
  const db = getDb();
  db.prepare('INSERT INTO product_codes (old_code, new_code, product_name) VALUES (?, ?, ?)').run(
    cleanCode(mapping.oldCode), cleanCode(mapping.newCode), mapping.productName || ''
  );
}

export function updateProductCode(id: number, mapping: Partial<ProductCodeMapping>): void {
  const db = getDb();
  const fields: string[] = [];
  const values: (string | number)[] = [];
  if (mapping.oldCode !== undefined) { fields.push('old_code = ?'); values.push(mapping.oldCode); }
  if (mapping.newCode !== undefined) { fields.push('new_code = ?'); values.push(mapping.newCode); }
  if (mapping.productName !== undefined) { fields.push('product_name = ?'); values.push(mapping.productName); }
  fields.push("updated_at = datetime('now')");
  values.push(id);
  db.prepare(`UPDATE product_codes SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteProductCode(id: number): void {
  const db = getDb();
  db.prepare('DELETE FROM product_codes WHERE id = ?').run(id);
}

export function importProductCodes(rows: string[][]): number {
  const db = getDb();
  const insert = db.prepare('INSERT INTO product_codes (old_code, new_code, product_name) VALUES (?, ?, ?)');
  const importMany = db.transaction((data: string[][]) => {
    let count = 0;
    for (const row of data) {
      if (row.length >= 2 && row[0].trim()) {
        insert.run(cleanCode(row[0].trim()), cleanCode(row[1].trim()), row[2]?.trim() || '');
        count++;
      }
    }
    return count;
  });
  return importMany(rows);
}

export function clearProductCodes(): void {
  const db = getDb();
  db.prepare('DELETE FROM product_codes').run();
}

export function replaceProductCode(code: string): string {
  const db = getDb();
  const result = db.prepare('SELECT new_code FROM product_codes WHERE old_code = ?').get(code) as { new_code: string } | undefined;
  return result ? result.new_code : code;
}
