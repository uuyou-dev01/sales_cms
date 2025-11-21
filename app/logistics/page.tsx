'use client'

import React from 'react'
import useSWR from 'swr'
import { RefreshCw, Search, SlidersHorizontal, LayoutGrid, Table as TableIcon, PackagePlus, Upload } from 'lucide-react'
import LogisticsTracker from '@/components/logistics-tracker'
import LogisticsDetailDrawer from '@/components/logistics/logistics-detail-drawer'
import CreateLogisticsDialog from '@/components/logistics/create-logistics-dialog'
import { ConsolidateLogisticsDialog } from '@/components/logistics/consolidate-logistics-dialog'
import { ImportConsolidationDialog } from '@/components/logistics/import-consolidation-dialog'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

type LogisticsRecord = {
  id: string
  trackingNo?: string | null
  status?: string | null
  destination?: string | null
  relatedType: string
  relatedId: string
  cost?: string | number | null
  currency?: string | null
  departedAt?: string | null
  arrivedAt?: string | null
  fromCountry?: string | null
  toCountry?: string | null
  fromNode?: string | null
  toNode?: string | null
  createdAt?: string
  segments?: unknown
  allocations?: unknown
}

const STATUS_FILTERS = [
  { value: 'all', label: '全部状态' },
  { value: 'PENDING', label: '待创建' },
  { value: 'IN_TRANSIT', label: '国内在途' },
  { value: 'AT_FORWARDER', label: '转运仓待发' },
  { value: 'LEAVING_CHINA', label: '已出境' },
  { value: 'AT_WAREHOUSE', label: '日本仓签收' },
  { value: 'DELIVERED', label: '已交付' },
  { value: 'EXCEPTION', label: '异常' },
]

const DESTINATION_FILTERS = [
  { value: 'all', label: '全部目的地' },
  { value: 'WAREHOUSE', label: '仓库' },
  { value: 'FORWARDER', label: '转运仓' },
  { value: 'CUSTOMER', label: '客户' },
]

function ensureArray<T>(value: unknown): T[] {
  if (!value) return []
  if (Array.isArray(value)) return value as T[]
  return []
}

export default function LogisticsPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/logistics', fetcher, {
    refreshInterval: 1000 * 60 * 5,
  })

  const [search, setSearch] = React.useState('')
  const [status, setStatus] = React.useState('all')
  const [destination, setDestination] = React.useState('all')
  const [mounted, setMounted] = React.useState(false)
  const [detailId, setDetailId] = React.useState<string | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [consolidateOpen, setConsolidateOpen] = React.useState(false)
  const [importOpen, setImportOpen] = React.useState(false)
  const [viewMode, setViewMode] = React.useState<'card' | 'table'>('table')
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const records: LogisticsRecord[] = (data?.data || []) as LogisticsRecord[]

  const derived = React.useMemo(() => {
    const noTracking = records.filter((r) => !r.trackingNo).length
    const inTransit = records.filter((r) => (r.status || 'PENDING') === 'IN_TRANSIT').length
    const pendingAllocations = records.filter((r) => ensureArray(r.allocations).length === 0).length
    return { noTracking, inTransit, pendingAllocations }
  }, [records])

  const filteredRecords = React.useMemo(() => {
    return records.filter((record) => {
      const matchesSearch =
        !search ||
        record.trackingNo?.toLowerCase().includes(search.toLowerCase()) ||
        record.relatedId.toLowerCase().includes(search.toLowerCase())

      const matchesStatus =
        status === 'all' || (record.status || 'PENDING').toUpperCase() === status

      const matchesDestination =
        destination === 'all' ||
        (record.destination || 'WAREHOUSE').toUpperCase() === destination

      return matchesSearch && matchesStatus && matchesDestination
    })
  }, [records, search, status, destination])

  const selectedRecords = React.useMemo(() => {
    return records.filter(r => selectedIds.includes(r.id))
  }, [records, selectedIds])

  if (!mounted) {
    return null
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">物流管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            跟踪采购批次、补录运单信息，并管理跨段运输与费用分摊。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            导入转运数据
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            新建物流记录
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="待补录运单"
          value={derived.noTracking}
          description="尚未填写运单号的记录"
        />
        <StatCard label="在途批次" value={derived.inTransit} description="当前处于运输中的记录" />
        <StatCard
          label="待费用分摊"
          value={derived.pendingAllocations}
          description="尚未拆分运费的批次"
        />
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap gap-3 justify-between items-center">
          <div className="flex flex-wrap gap-3 flex-1">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索运单号 / 关联ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DESTINATION_FILTERS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" onClick={() => {
              setSearch('')
              setStatus('all')
              setDestination('all')
            }}>
              重置
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
             {selectedIds.length > 0 && (
                 <Button 
                    size="sm" 
                    variant="secondary"
                    className="flex items-center gap-1"
                    onClick={() => setConsolidateOpen(true)}
                 >
                     <PackagePlus className="h-4 w-4" />
                     合并转运 ({selectedIds.length})
                 </Button>
             )}
             <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as any)}>
                <ToggleGroupItem value="table" aria-label="表格视图">
                    <TableIcon className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="card" aria-label="卡片视图">
                    <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
             </ToggleGroup>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>加载物流列表失败</AlertTitle>
            <AlertDescription>请刷新页面或检查网络</AlertDescription>
          </Alert>
        )}

        <LogisticsTracker
          records={filteredRecords}
          className="mt-4"
          emptyMessage="暂无符合条件的物流记录"
          onSelectRecord={(record) => {
            setDetailId(record.id)
            setDetailOpen(true)
          }}
          selectedId={detailOpen ? detailId : null}
          selectionMode={viewMode === 'table'}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </Card>

      <LogisticsDetailDrawer
        recordId={detailId}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) setDetailId(null)
        }}
        onUpdated={() => mutate()}
      />

      <CreateLogisticsDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={async (id) => {
          await mutate()
          if (id) {
            setDetailId(id)
            setDetailOpen(true)
          }
        }}
      />

      <ConsolidateLogisticsDialog
        open={consolidateOpen}
        selectedRecords={selectedRecords}
        onClose={() => setConsolidateOpen(false)}
        onConsolidated={async () => {
            await mutate()
            setSelectedIds([])
        }}
      />

      <ImportConsolidationDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={async () => {
          await mutate()
        }}
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  description,
  className,
}: {
  label: string
  value: number
  description?: string
  className?: string
}) {
  return (
    <Card className={cn('p-4 space-y-2', className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-semibold">{value}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </Card>
  )
}
