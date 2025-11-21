'use client'

import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

let client: QueryClient | null = null
function getClient() {
  if (!client) client = new QueryClient()
  return client
}

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const qc = React.useMemo(() => getClient(), [])
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}


