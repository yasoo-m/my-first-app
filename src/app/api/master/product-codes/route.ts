import { NextRequest, NextResponse } from 'next/server';
import { getAllProductCodes, searchProductCodes, addProductCode, updateProductCode, deleteProductCode, importProductCodes, clearProductCodes } from '@/lib/masters/product-code';
import { parseCSV } from '@/lib/csv-parser';
import { recordImport } from '@/lib/db';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  const data = query ? searchProductCodes(query) : getAllProductCodes();
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    // CSV import
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const clearExisting = formData.get('clear') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'ファイルが必要です' }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCSV(text);
    // Skip header if it looks like a header
    const dataRows = rows.length > 0 && rows[0][0]?.match(/^[a-zA-Zぁ-ん]/) ? rows.slice(1) : rows;

    if (clearExisting) {
      clearProductCodes();
    }

    const count = importProductCodes(dataRows);
    recordImport('商品コード入替', file.name, count);
    return NextResponse.json({ imported: count });
  }

  // Single add
  const body = await request.json();
  addProductCode(body);
  return NextResponse.json({ success: true });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...mapping } = body;
  if (!id) {
    return NextResponse.json({ error: 'IDが必要です' }, { status: 400 });
  }
  updateProductCode(id, mapping);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'IDが必要です' }, { status: 400 });
  }
  deleteProductCode(parseInt(id, 10));
  return NextResponse.json({ success: true });
}
