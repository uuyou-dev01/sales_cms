'use client'

import { useQuery } from '@tanstack/react-query'

async function fetchTransactions() {
  const res = await fetch('/api/sales/transactions', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to load transactions')
  const json = await res.json()
  return json.data ?? json
}

export function useTransactions() {
  return useQuery({ queryKey: ['sales','transactions'], queryFn: fetchTransactions })
}


