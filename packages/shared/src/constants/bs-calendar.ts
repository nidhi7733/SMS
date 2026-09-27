export interface NepaliMonth {
  index: number; // 1-12
  nameEn: string;
  nameNp: string;
}

export const NEPALI_MONTHS: NepaliMonth[] = [
  { index: 1, nameEn: 'Baisakh', nameNp: 'वैशाख' },
  { index: 2, nameEn: 'Jestha', nameNp: 'जेठ' },
  { index: 3, nameEn: 'Ashadh', nameNp: 'असार' },
  { index: 4, nameEn: 'Shrawan', nameNp: 'साउन' },
  { index: 5, nameEn: 'Bhadra', nameNp: 'भदौ' },
  { index: 6, nameEn: 'Ashwin', nameNp: 'असोज' },
  { index: 7, nameEn: 'Kartik', nameNp: 'कात्तिक' },
  { index: 8, nameEn: 'Mangsir', nameNp: 'मंसिर' },
  { index: 9, nameEn: 'Poush', nameNp: 'पुस' },
  { index: 10, nameEn: 'Magh', nameNp: 'माघ' },
  { index: 11, nameEn: 'Falgun', nameNp: 'फागुन' },
  { index: 12, nameEn: 'Chaitra', nameNp: 'चैत' },
];

export const DEVANAGARI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

/**
 * Converts Western digits (0-9) to Devanagari digits (०-९)
 */
export function toDevanagariDigits(num: number | string): string {
  return String(num).replace(/[0-9]/g, (digit) => DEVANAGARI_DIGITS[parseInt(digit, 10)]);
}

/**
 * Converts Devanagari digits (०-९) to Western digits (0-9)
 */
export function toWesternDigits(str: string): string {
  let res = str;
  DEVANAGARI_DIGITS.forEach((devDigit, idx) => {
    res = res.replaceAll(devDigit, String(idx));
  });
  return res;
}
