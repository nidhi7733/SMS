declare module 'bikram-sambat' {
  export function toBik(date: Date | string): { year: number; month: number; day: number };
  export function toGreg(year: number, month: number, day: number): { year: number; month: number; day: number };
  export function daysInMonth(year: number, month: number): number;
  export function toDev(num: number | string): string;
}
