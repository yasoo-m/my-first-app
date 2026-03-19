import { getDb } from '../db';
import type { PaymentMethodMapping } from '../types';

export function getAllPaymentMethods(): PaymentMethodMapping[] {
  const db = getDb();
  return db.prepare('SELECT id, old_name as oldName, new_name as newName FROM payment_methods ORDER BY id').all() as PaymentMethodMapping[];
}

export function addPaymentMethod(mapping: PaymentMethodMapping): void {
  const db = getDb();
  db.prepare('INSERT INTO payment_methods (old_name, new_name) VALUES (?, ?)').run(mapping.oldName, mapping.newName);
}

export function updatePaymentMethod(id: number, mapping: Partial<PaymentMethodMapping>): void {
  const db = getDb();
  const fields: string[] = [];
  const values: (string | number)[] = [];
  if (mapping.oldName !== undefined) { fields.push('old_name = ?'); values.push(mapping.oldName); }
  if (mapping.newName !== undefined) { fields.push('new_name = ?'); values.push(mapping.newName); }
  fields.push("updated_at = datetime('now')");
  values.push(id);
  db.prepare(`UPDATE payment_methods SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function deletePaymentMethod(id: number): void {
  const db = getDb();
  db.prepare('DELETE FROM payment_methods WHERE id = ?').run(id);
}

export function importPaymentMethods(rows: string[][]): number {
  const db = getDb();
  const insert = db.prepare('INSERT INTO payment_methods (old_name, new_name) VALUES (?, ?)');
  const importMany = db.transaction((data: string[][]) => {
    let count = 0;
    for (const row of data) {
      if (row.length >= 2 && row[0].trim()) {
        insert.run(row[0].trim(), row[1].trim());
        count++;
      }
    }
    return count;
  });
  return importMany(rows);
}

export function clearPaymentMethods(): void {
  const db = getDb();
  db.prepare('DELETE FROM payment_methods').run();
}

export function replacePaymentMethod(method: string): string {
  const db = getDb();
  const result = db.prepare('SELECT new_name FROM payment_methods WHERE old_name = ?').get(method) as { new_name: string } | undefined;
  return result ? result.new_name : method;
}
