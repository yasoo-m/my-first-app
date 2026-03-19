import type { BrandType, ConversionWarning, UnifiedRow } from '../types';
import { STORE_NAMES, type MallType } from '../types';
import { replaceProductCode } from '../masters/product-code';
import { replacePaymentMethod } from '../masters/payment-method';
import { lookupPostalCode } from '../masters/postal-code';
import { lookupCost } from '../masters/cost';

export function getStoreName(brand: BrandType, mall: MallType): string {
  return STORE_NAMES[`${brand}_${mall}`] || '';
}

export function formatShippingDate(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function formatShippingMonth(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export function parseNumber(val: string): number {
  if (!val || val.trim() === '') return 0;
  const num = parseFloat(val.replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
}

export function removeHyphen(str: string): string {
  return str.replace(/-/g, '').replace(/−/g, '').trim();
}

export function taxExclude(taxIncluded: number): number {
  return Math.round(taxIncluded / 1.1);
}

export function cleanProductCode(code: string): string {
  return code.replace(/["=]/g, '');
}

export async function resolveProductCode(code: string): Promise<string> {
  const cleaned = cleanProductCode(code);
  return await replaceProductCode(cleaned);
}

export async function resolveCost(productCode: string, brand: BrandType, rowIndex: number, warnings: ConversionWarning[]): Promise<number | null> {
  const cost = await lookupCost(productCode, brand);
  if (cost === null && productCode) {
    warnings.push({
      row: rowIndex + 1,
      column: 'J',
      message: `商品コード「${productCode}」の原価が見つかりません`,
      type: 'cost_not_found',
    });
  }
  return cost;
}

export async function resolvePaymentMethod(method: string): Promise<string> {
  return await replacePaymentMethod(method);
}

export async function resolvePostalCode(postalCode: string, rowIndex: number, warnings: ConversionWarning[]): Promise<{ prefecture: string; city: string }> {
  if (!postalCode || postalCode.length !== 7) {
    if (postalCode && postalCode.length > 0) {
      warnings.push({
        row: rowIndex + 1,
        column: 'C',
        message: `郵便番号「${postalCode}」が不正です（7桁でない）`,
        type: 'postal_invalid',
      });
    }
    return { prefecture: '', city: '' };
  }
  const entry = await lookupPostalCode(postalCode);
  return entry ? { prefecture: entry.prefecture, city: entry.city } : { prefecture: '', city: '' };
}

export function buildRow(params: {
  date: Date | null;
  postalCode: string;
  prefecture: string;
  city: string;
  orderNumber: string;
  memberNumber: string;
  storeName: string;
  productCode: string;
  costPrice: number | null;
  subtotal: number;
  quantity: number;
  shippingFee: number;
  paymentMethod: string;
}): UnifiedRow {
  const { date, postalCode, prefecture, city, orderNumber, memberNumber, storeName, productCode, costPrice, subtotal, quantity, shippingFee, paymentMethod } = params;

  const total = subtotal * quantity;
  const costTotal = costPrice !== null ? costPrice * quantity : null;
  const totalSales = total + shippingFee;
  const grossProfit = costTotal !== null ? totalSales - costTotal : null;

  return {
    shippingDate: date ? formatShippingDate(date) : '',
    shippingMonth: date ? formatShippingMonth(date) : '',
    postalCode,
    prefecture,
    city,
    orderNumber,
    memberNumber,
    storeName,
    productCode,
    costPrice,
    costTotal,
    subtotal: Math.round(subtotal),
    quantity,
    total: Math.round(total),
    shippingFee: Math.round(shippingFee),
    totalSales: Math.round(totalSales),
    grossProfit: grossProfit !== null ? Math.round(grossProfit) : null,
    paymentMethod,
  };
}
