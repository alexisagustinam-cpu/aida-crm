export function companyRemovalDecision(counts: { deals: number; projects: number; invoices: number; contacts: number }) {
  if (Object.values(counts).some((count) => count > 0)) {
    return { allowed: false as const, reason: 'No se puede eliminar permanentemente: la empresa tiene registros vinculados. Archívala en su lugar.' }
  }
  return { allowed: true as const }
}
