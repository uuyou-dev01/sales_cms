"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { GalleryVerticalEnd, AudioWaveform, Command } from "lucide-react"

import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"
import { TeamSwitcher } from "./team-switcher"
import { PriceCalculator } from "./price-calculator"
import { InventoryCounter } from "./mini-program/inventory-counter"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar"
import { sidebarNavConfig, systemManagementLinks, type SidebarNavItem, type SidebarNavChild } from "./sidebar-config"

interface InventoryStats {
  totalItems?: number
  inStockCount?: number
  soldCount?: number
  thisMonthSoldCount?: number
  thisMonthSoldAmount?: number
  thisMonthPurchaseCount?: number
}

interface CategoryStat {
  type: string
  total: number
  inStock: number
  sold: number
}

interface WarehousePosition {
  id: string
  name: string
  capacity: number
  used: number
}

interface Warehouse {
  id: string
  name: string
  positions: WarehousePosition[]
}

type SidebarNavState = SidebarNavItem & { isActive: boolean }

const DEFAULT_USER = {
  name: "shadcn",
  email: "m@example.com",
  avatar: "/avatars/shadcn.jpg",
}

const DEFAULT_TEAMS = [
  {
    name: "Acme Inc",
    logo: GalleryVerticalEnd,
    plan: "Enterprise",
  },
  {
    name: "Acme Corp.",
    logo: AudioWaveform,
    plan: "Startup",
  },
  {
    name: "Evil Corp.",
    logo: Command,
    plan: "Free",
  },
]


const MAX_CATEGORY_ITEMS = 4
const MAX_MONTH_ITEMS = 6
const MAX_WAREHOUSE_ITEMS = 3

async function fetcher<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json?.error || "Request failed")
  }
  return (json?.data ?? json) as T
}

function formatBadgeNumber(value?: number) {
  if (value === undefined || value === null) return undefined
  if (value >= 10000) return `${(value / 10000).toFixed(1)}w`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return `${value}`
}

function formatMonthLabel(monthKey: string) {
  const [year, rawMonth] = monthKey.split("-")
  const numericMonth = Number(rawMonth)
  if (!year || Number.isNaN(numericMonth)) return monthKey
  const monthNames = [
    "一月",
    "二月",
    "三月",
    "四月",
    "五月",
    "六月",
    "七月",
    "八月",
    "九月",
    "十月",
    "十一月",
    "十二月",
  ]
  return `${year}年${monthNames[numericMonth - 1] || monthKey}`
}

function summarizeWarehouse(warehouse: Warehouse) {
  return warehouse.positions.reduce(
    (acc, pos) => {
      acc.capacity += pos.capacity || 0
      acc.used += pos.used || 0
      return acc
    },
    { capacity: 0, used: 0 }
  )
}

function buildInventoryChildren(
  stats?: InventoryStats,
  categories: CategoryStat[] = [],
  warehouses: Warehouse[] = []
): SidebarNavChild[] | undefined {
  const children: SidebarNavChild[] = []

  if (stats) {
    children.push(
      {
        key: "inventory-total",
        title: "全部库存",
        url: "/inventory",
        badge: formatBadgeNumber(stats.totalItems),
      },
      {
        key: "inventory-in-stock",
        title: "在库商品",
        url: "/inventory?status=in_stock",
        badge: formatBadgeNumber(stats.inStockCount),
      },
      {
        key: "inventory-sold",
        title: "已售商品",
        url: "/inventory?status=sold",
        badge: formatBadgeNumber(stats.soldCount),
      }
    )
  }

  if (categories.length > 0) {
    const categoryItems = categories
      .filter((cat) => cat.total > 0)
      .slice(0, MAX_CATEGORY_ITEMS)
      .map((cat) => ({
        key: `inventory-cat-${cat.type}`,
        title: cat.type,
        url: `/inventory?category=${encodeURIComponent(cat.type)}`,
        badge: formatBadgeNumber(cat.total),
      }))

    if (categoryItems.length > 0) {
      children.push({
        key: "inventory-categories",
        title: "热门分类",
        url: "/inventory/categories",
        items: categoryItems,
      })
    }
  }

  if (warehouses.length > 0) {
    const warehouseItems = warehouses.slice(0, MAX_WAREHOUSE_ITEMS).map((warehouse) => {
      const summary = summarizeWarehouse(warehouse)
      const usage = summary.capacity > 0 ? Math.round((summary.used / summary.capacity) * 100) : 0
      return {
        key: `inventory-warehouse-${warehouse.id}`,
        title: warehouse.name,
        url: "/warehouse",
        badge: `${usage}%`,
      }
    })

    if (warehouseItems.length > 0) {
      children.push({
        key: "inventory-warehouses",
        title: "仓库负载",
        url: "/warehouse",
        items: warehouseItems,
      })
    }
  }

  return children.length > 0 ? children : undefined
}

function buildSalesChildren(
  stats?: InventoryStats,
  categories: CategoryStat[] = [],
  months: string[] = []
): SidebarNavChild[] | undefined {
  const children: SidebarNavChild[] = []

  children.push({
    key: "sales-overview",
    title: "销售看板",
    url: "/sales",
    badge: stats?.thisMonthSoldCount ? `本月 ${stats.thisMonthSoldCount}` : undefined,
  })

  const monthItems = months.slice(0, MAX_MONTH_ITEMS).map((month) => ({
    key: `sales-month-${month}`,
    title: formatMonthLabel(month),
    url: `/sales/${month}`,
  }))

  if (monthItems.length > 0) {
    children.push({
      key: "sales-months",
      title: "按月份查看",
      url: "/sales",
      items: monthItems,
    })
  }

  const categoryItems = categories
    .filter((cat) => cat.total > 0)
    .slice(0, MAX_CATEGORY_ITEMS)
    .map((cat) => ({
      key: `sales-cat-${cat.type}`,
      title: cat.type,
      url: `/sales?category=${encodeURIComponent(cat.type)}`,
      badge: formatBadgeNumber(cat.total),
    }))

  if (categoryItems.length > 0) {
    children.push({
      key: "sales-categories",
      title: "按分类查看",
      url: "/sales",
      items: categoryItems,
    })
  }

  return children
}

function buildListingsChildren(stats?: InventoryStats): SidebarNavChild[] | undefined {
  const children: SidebarNavChild[] = [
    {
      key: "listings-template",
      title: "模板上架",
      url: "/listings?mode=template",
      badge: stats?.inStockCount ? `库存 ${formatBadgeNumber(stats.inStockCount)}` : undefined,
    },
    {
      key: "listings-item",
      title: "单件上架",
      url: "/listings?mode=item",
    },
  ]
  return children
}

function buildPurchaseChildren(stats?: InventoryStats): SidebarNavChild[] | undefined {
  const children: SidebarNavChild[] = [
    {
      key: "purchase-orders",
      title: "采购单列表",
      url: "/purchase",
    },
  ]

  if (stats?.thisMonthPurchaseCount) {
    children.unshift({
      key: "purchase-month",
      title: "本月采购",
      url: "/purchase?range=this_month",
      badge: `${stats.thisMonthPurchaseCount}`,
    })
  }

  return children
}

function buildDynamicItems(
  pathname: string | null,
  stats?: InventoryStats,
  categories: CategoryStat[] = [],
  months: string[] = [],
  warehouses: Warehouse[] = []
): SidebarNavState[] {
  return sidebarNavConfig.map((item) => {
    let dynamicChildren: SidebarNavChild[] | undefined

    switch (item.key) {
      case "inventory":
        dynamicChildren = buildInventoryChildren(stats, categories, warehouses)
        break
      case "sales":
        dynamicChildren = buildSalesChildren(stats, categories, months)
        break
      case "listings":
        dynamicChildren = buildListingsChildren(stats)
        break
      case "purchase":
        dynamicChildren = buildPurchaseChildren(stats)
        break
      default:
        dynamicChildren = item.items
    }

    return {
      ...item,
      isActive: pathname ? pathname.startsWith(item.url) : false,
      items: dynamicChildren,
    }
  })
}

function useSidebarData() {
  const pathname = usePathname()

  const { data: stats } = useQuery<InventoryStats>({
    queryKey: ["sidebar", "inventory-stats"],
    queryFn: ({ signal }) => fetcher<InventoryStats>("/api/inventory/items/stats", signal),
    staleTime: 5 * 60_000,
  })

  const { data: categoriesResponse } = useQuery<{ success?: boolean; categories?: CategoryStat[] }>({
    queryKey: ["sidebar", "sku-categories"],
    queryFn: ({ signal }) => fetcher<{ success?: boolean; categories?: CategoryStat[] }>("/api/sku/categories", signal),
    staleTime: 10 * 60_000,
  })

  const { data: months } = useQuery<string[]>({
    queryKey: ["sidebar", "sales-months"],
    queryFn: ({ signal }) => fetcher<string[]>("/api/inventory/items/months", signal),
    staleTime: 60 * 60_000,
  })

  const { data: warehouses } = useQuery<Warehouse[]>({
    queryKey: ["sidebar", "warehouses"],
    queryFn: ({ signal }) => fetcher<Warehouse[]>("/api/warehouses", signal),
    staleTime: 30 * 60_000,
  })

  const navItems = React.useMemo(
    () =>
      buildDynamicItems(
        pathname ?? null,
        stats,
        categoriesResponse?.categories ?? [],
        months ?? [],
        warehouses ?? []
      ),
    [pathname, stats, categoriesResponse?.categories, months, warehouses]
  )

  return {
    user: DEFAULT_USER,
    teams: DEFAULT_TEAMS,
    navItems,
  }
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const data = useSidebarData()
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navItems} />
        <div className="px-3 py-2 mt-4">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">设置</h2>
          <div className="space-y-1">
            {systemManagementLinks.map((link) => (
              <Link
                key={link.key}
                className={`flex items-center gap-2 rounded px-4 py-2 text-sm hover:bg-accent ${
                  pathname?.startsWith(link.url) ? 'bg-accent font-medium' : ''
                }`}
                href={link.url}
              >
                {link.icon && <link.icon className="h-4 w-4" />}
                {link.title}
              </Link>
            ))}
          </div>
        </div>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 pb-2 space-y-1">
          <PriceCalculator />
          <InventoryCounter />
        </div>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
