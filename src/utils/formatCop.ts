const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function formatCop(amountPesos: number): string {
  return copFormatter.format(amountPesos);
}
