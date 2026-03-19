import type { BrandType, MallType, ConversionResult } from '../types';
import { convertAmazon } from './amazon';
import { convertRakuten } from './rakuten';
import { convertYahoo } from './yahoo';
import { convertMakeshop } from './makeshop';

export type Converter = (rows: string[][], brand: BrandType) => Promise<ConversionResult>;

const converters: Record<MallType, Converter | null> = {
  amazon: convertAmazon,
  rakuten: convertRakuten,
  yahoo: convertYahoo,
  makeshop: convertMakeshop,
  mercari: null,
  aupay: null,
};

export function getConverter(mall: MallType): Converter | null {
  return converters[mall];
}
