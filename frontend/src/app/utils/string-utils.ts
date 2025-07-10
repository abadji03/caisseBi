// utils/string-utils.ts
export function normalize(str: string | null | undefined): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
