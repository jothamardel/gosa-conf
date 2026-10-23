/**
 * Standardized Canonical Pricing Catalog for GOSA 2026 Convention
 * All monetary amounts are in Nigerian Naira (NGN).
 * 
 * NOTE: These official convention prices are hard constants across both client
 * and server to prevent environment variable desynchronization (e.g. stale env vars on Vercel).
 */

export const CONVENTION_PRICING = {
  convention: 1000,
  dinner: 2500,
  brochure: 2000,
  brochure_physical: 2000,
  brochure_digital: 2000,
  uniform: 17000,
  emblem: 2000,
  magazine: 3000,
  donation: 0,
} as const;

export type ServiceType = keyof typeof CONVENTION_PRICING;

export function getServiceUnitPrice(type: string): number {
  if (type === 'brochure_physical' || type === 'brochure_digital') {
    return 2000;
  }
  return (CONVENTION_PRICING as Record<string, number>)[type] ?? 0;
}
