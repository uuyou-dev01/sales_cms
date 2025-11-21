'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface SkusQuery {
  page?: number
  pageSize?: number
  categoryId?: string
  brand?: string
  status?: string
  search?: string
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error || 'Request failed')
  return json.data as T
}

export function useSkus(params: SkusQuery) {
  const qp = new URLSearchParams()
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length > 0) qp.set(k, String(v))
  })
  return useQuery({
    queryKey: ['skus', Object.fromEntries(qp)],
    queryFn: () => fetchJson<{ total: number; data: any[] }>(`/api/sku?${qp.toString()}`),
  })
}

export function useSkuDetail(id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ['sku', id],
    queryFn: () => fetchJson<any>(`/api/sku/${id}`),
  })
}

export function useSkuMutation() {
  const qc = useQueryClient()
  const create = useMutation({
    mutationFn: (body: any) => fetchJson<any>('/api/sku', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['skus'] }),
  })
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => fetchJson<any>(`/api/sku/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['skus'] })
      qc.invalidateQueries({ queryKey: ['sku', id] })
    },
  })
  const remove = useMutation({
    mutationFn: (id: string) => fetchJson<any>(`/api/sku/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['skus'] }),
  })
  return { create, update, remove }
}

 
