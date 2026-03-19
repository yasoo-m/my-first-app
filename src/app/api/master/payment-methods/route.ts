import { NextRequest, NextResponse } from 'next/server';
import { getAllPaymentMethods, addPaymentMethod, updatePaymentMethod, deletePaymentMethod, importPaymentMethods, clearPaymentMethods } from '@/lib/masters/payment-method';
import { parseCSV } from '@/lib/csv-parser';
import { recordImport } from '@/lib/db';

export async function GET() {
  const data = getAllPaymentMethods();
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const clearExisting = formData.get('clear') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'ファイルが必要です' }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCSV(text);
    const dataRows = rows.length > 0 && rows[0][0]?.match(/^[a-zA-Zぁ-ん]/) ? rows.slice(1) : rows;

    if (clearExisting) {
      clearPaymentMethods();
    }

    const count = importPaymentMethods(dataRows);
    recordImport('支払方法入替', file.name, count);
    return NextResponse.json({ imported: count });
  }

  const body = await request.json();
  addPaymentMethod(body);
  return NextResponse.json({ success: true });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...mapping } = body;
  if (!id) {
    return NextResponse.json({ error: 'IDが必要です' }, { status: 400 });
  }
  updatePaymentMethod(id, mapping);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'IDが必要です' }, { status: 400 });
  }
  deletePaymentMethod(parseInt(id, 10));
  return NextResponse.json({ success: true });
}
