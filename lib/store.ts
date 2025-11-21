import { create } from 'zustand'
import type { Item, Warehouse, ExchangeRate, User } from '@prisma/client'

interface GlobalState {
  user: User | null
  warehouses: Warehouse[]
  exchangeRates: ExchangeRate[]
  selectedItems: Item[]
  setUser: (u: User | null) => void
  setWarehouses: (w: Warehouse[]) => void
  setExchangeRates: (r: ExchangeRate[]) => void
  setSelectedItems: (items: Item[]) => void
  clearSelectedItems: () => void
}

export const useGlobalStore = create<GlobalState>((set) => ({
  user: null,
  warehouses: [],
  exchangeRates: [],
  selectedItems: [],
  setUser: (user) => set({ user }),
  setWarehouses: (warehouses) => set({ warehouses }),
  setExchangeRates: (exchangeRates) => set({ exchangeRates }),
  setSelectedItems: (selectedItems) => set({ selectedItems }),
  clearSelectedItems: () => set({ selectedItems: [] }),
}))


