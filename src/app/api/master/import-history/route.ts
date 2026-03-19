import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const rows = db.prepare(
    'SELECT id, category, file_name, record_count, imported_at FROM import_history ORDER BY imported_at DESC LIMIT 50'
  ).all();
  return NextResponse.json(rows);
}
