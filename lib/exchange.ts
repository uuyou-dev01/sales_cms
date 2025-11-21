import { prisma } from '@/lib/prisma'

type CacheKey = string
const rateCache = new Map<CacheKey, { rate: number; at: number }>()
const TTL_MS = 5 * 60 * 1000

function makeKey(base: string, quote: string, date?: string) {
  return `${base.toUpperCase()}-${quote.toUpperCase()}-${date || 'latest'}`
}

export async function getLatestRate(baseCurrency: string, quoteCurrency: string): Promise<number | null> {
  const key = makeKey(baseCurrency, quoteCurrency)
  const cached = rateCache.get(key)
  if (cached && Date.now() - cached.at < TTL_MS) return cached.rate

  const rec = await prisma.exchangeRate.findFirst({
    where: { baseCurrency: baseCurrency.toUpperCase(), quoteCurrency: quoteCurrency.toUpperCase() },
    orderBy: { rateDate: 'desc' },
  })
  if (!rec) return null
  const rate = Number(rec.rate)
  rateCache.set(key, { rate, at: Date.now() })
  return rate
}

export function convert(amount: number, rate: number): number {
  return amount * rate
}


