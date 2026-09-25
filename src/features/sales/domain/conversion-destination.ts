export function conversionDestination(dealId: string) {
  return `/sales/pipeline?deal=${encodeURIComponent(dealId)}&notice=converted`
}
