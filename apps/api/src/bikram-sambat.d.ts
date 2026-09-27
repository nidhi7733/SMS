declare module 'bikram-sambat' {
  export function toBik(date: Date): { year: number; month: number; day: number };
  export function toGreg(year: number, month: number, day: number): { year: number; month: number; day: number };
  export function daysInMonth(year: number, month: number): number;
  const bikramSambat: {
    toBik: typeof toBik;
    toGreg: typeof toGreg;
    daysInMonth: typeof daysInMonth;
  };
  export default bikramSambat;
}
