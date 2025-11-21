import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  PackageSearch,
  ShoppingCart,
  Boxes,
  Store,
  LineChart,
  Truck,
  Wallet,
  ShieldCheck,
  FolderTree,
  Monitor,
} from 'lucide-react'

export type SidebarNavLeaf = {
  key: string
  title: string
  url: string
  badge?: string
  icon?: LucideIcon
}

export type SidebarNavChild = {
  key: string
  title: string
  url: string
  badge?: string
  items?: SidebarNavLeaf[]
}

export type SidebarNavItem = {
  key: string
  title: string
  url: string
  icon: LucideIcon
  group: 'operation' | 'supply' | 'sales' | 'support'
  items?: SidebarNavChild[]
}

export const sidebarNavConfig: SidebarNavItem[] = [
  {
    key: 'overview',
    title: '总览',
    url: '/dashboard',
    icon: LayoutDashboard,
    group: 'operation',
  },
  {
    key: 'catalog',
    title: '商品与 SKU',
    url: '/sku',
    icon: PackageSearch,
    group: 'supply',
  },
  {
    key: 'purchase',
    title: '采购管理',
    url: '/purchase',
    icon: ShoppingCart,
    group: 'supply',
  },
  {
    key: 'inventory',
    title: '库存管理',
    url: '/inventory',
    icon: Boxes,
    group: 'supply',
  },
  {
    key: 'listings',
    title: '上架管理',
    url: '/listings',
    icon: Store,
    group: 'sales',
  },
  {
    key: 'sales',
    title: '销售结算',
    url: '/sales',
    icon: LineChart,
    group: 'sales',
  },
  {
    key: 'logistics',
    title: '物流追踪',
    url: '/logistics',
    icon: Truck,
    group: 'support',
  },
  {
    key: 'finance',
    title: '财务中心',
    url: '/finance',
    icon: Wallet,
    group: 'support',
  },
  {
    key: 'users',
    title: '用户与权限',
    url: '/users',
    icon: ShieldCheck,
    group: 'support',
  },
]

export const systemManagementLinks: Array<{ key: string; title: string; url: string; icon: LucideIcon }> = [
  { key: 'categories', title: '品类管理', url: '/admin/categories', icon: FolderTree },
  { key: 'platforms', title: '销售平台管理', url: '/admin/platforms', icon: Monitor },
]

