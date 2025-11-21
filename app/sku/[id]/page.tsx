'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSkuDetail } from '@/src/modules/sku/hooks/useSkus'
import { Edit, Package, TrendingUp, Warehouse, ChevronDown, ChevronUp, ArrowLeft, ShoppingCart, Plus, ShoppingBag } from 'lucide-react'
import { SubSkuTemplateCard } from '@/src/modules/sku/components/SubSkuTemplateCard'
import { NewSubSkuDialog } from '@/src/modules/sku/components/NewSubSkuDialog'
import { EditSubSkuTemplateDialog } from '@/src/modules/sku/components/EditSubSkuTemplateDialog'
import { CreateSaleDialog } from '@/src/modules/sales/components/CreateSaleDialog'
import { CreatePurchaseDialog } from '@/src/modules/sku/components/CreatePurchaseDialog'
import dynamic from 'next/dynamic'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const SmartSkuForm = dynamic(() => import('@/src/modules/sku/components/SmartSkuForm').then(m => m.default || m), { ssr: false })

type TxDetailLite = { transaction?: { soldDate?: string | Date | null }, unitPrice?: number | string }
type ItemLite = {
  itemId: string
  itemName: string
  itemNumber?: string
  itemSize?: string
  itemCondition?: string
  itemColor?: string | null
  itemRemarks?: string | null
  toyCharacterName?: string | null
  photos?: string[]
  transactionDetails?: TxDetailLite[]
}

export default function SkuDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const skuId = params.id as string
  const [editMode, setEditMode] = React.useState(false)
  const { data: sku, isLoading, refetch } = useSkuDetail(skuId)
  const [showAllItems, setShowAllItems] = React.useState(false)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [saleDialogOpen, setSaleDialogOpen] = React.useState(false)
  const [purchaseDialogOpen, setPurchaseDialogOpen] = React.useState(false)
  const [editingTemplate, setEditingTemplate] = React.useState<any | null>(null)
  const [toggleLoading, setToggleLoading] = React.useState<string | null>(null)
  const SmartFormAny = SmartSkuForm as unknown as React.ComponentType<{ onSuccess: () => void; initialData?: unknown }>

  const subSkuTemplates = React.useMemo(() => {
    if (!sku) return []
    if (Array.isArray(sku.subSkuTemplates) && sku.subSkuTemplates.length > 0) {
      return sku.subSkuTemplates
    }
    return (sku.items || []).map((item: any) => ({
      id: item.itemId,
      itemName: item.itemName,
      itemSize: item.itemSize,
      itemCondition: item.itemCondition,
      variantLabel: item.toyCharacterName,
      itemColor: item.itemColor,
      photos: item.photos || [],
      itemRemarks: item.itemRemarks,
      stats: {
        total: 1,
        inStock: item.status === 'IN_STOCK' ? 1 : 0,
        sold: item.status === 'SOLD' ? 1 : 0,
        inTransit: item.status === 'IN_TRANSIT' ? 1 : 0,
      },
      isActive: item.status !== 'ARCHIVED',
      __fallback: true,
    }))
  }, [sku])

  const handleEditSuccess = async () => {
    setEditMode(false)
    await refetch()
  }

  const handleToggleTemplate = async (template: any) => {
    if (!template || template.__fallback) return
    try {
      setToggleLoading(template.id)
      const res = await fetch(`/api/sku/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !(template.isActive !== false) }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json?.message || json?.error || '操作失败')
      }
      await refetch()
    } catch (error) {
      console.error('toggle template error', error)
    } finally {
      setToggleLoading(null)
    }
  }

  if (isLoading) {
    return (
      <div className="py-8 text-center">加载中...</div>
    )
  }

  if (!sku) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-500 mb-4">SKU 不存在</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <h1 className="text-2xl font-semibold">{sku.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="default" size="sm" onClick={() => setPurchaseDialogOpen(true)}>
            <ShoppingBag className="h-4 w-4 mr-2" />
            创建采购单
          </Button>
          <Button variant="default" size="sm" onClick={() => setSaleDialogOpen(true)}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            创建销售
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditMode((v) => !v)}>
            <Edit className="h-4 w-4 mr-2" />
            {editMode ? '完成' : '编辑'}
          </Button>
        </div>
      </div>

      {/* 基础信息 或 编辑表单 */}
      {editMode ? (
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg">编辑 SKU</CardTitle>
          </CardHeader>
          <CardContent>
            <SmartFormAny onSuccess={handleEditSuccess} initialData={sku} />
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg">基础信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              {/* SKU图片 */}
              <div className="flex-shrink-0">
                {sku.attributes && typeof sku.attributes === 'object' && 'mainPhoto' in sku.attributes && (sku.attributes as any).mainPhoto ? (
                  <img 
                    src={(sku.attributes as any).mainPhoto} 
                    alt={sku.name}
                    className="w-32 h-32 object-cover rounded-lg border"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = `https://via.placeholder.com/200x200/cccccc/999999?text=${encodeURIComponent(sku.name || 'SKU')}`
                    }}
                  />
                ) : sku.items && sku.items.length > 0 && sku.items[0]?.photos && sku.items[0].photos.length > 0 ? (
                  <img 
                    src={sku.items[0].photos[0]} 
                    alt={sku.name}
                    className="w-32 h-32 object-cover rounded-lg border"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = `https://via.placeholder.com/200x200/cccccc/999999?text=${encodeURIComponent(sku.name || 'SKU')}`
                    }}
                  />
                ) : (
                  <div className="w-32 h-32 bg-gray-100 rounded-lg border flex items-center justify-center">
                    <Package className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </div>
              
              {/* 信息 */}
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">品牌</label>
                    <p className="font-medium">{sku.brand || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">分类</label>
                    <p className="font-medium">{sku.category?.name || '未分类'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">状态</label>
                    <Badge variant={sku.isActive ? "default" : "secondary"}>
                      {sku.isActive ? '启用' : '禁用'}
                    </Badge>
                  </div>
                  {sku.unit && (
                    <div>
                      <label className="text-sm text-gray-500">单位</label>
                      <p className="font-medium">{sku.unit}</p>
                    </div>
                  )}
                  {sku.skuNumber && (
                    <div>
                      <label className="text-sm text-gray-500">货号</label>
                      <p className="font-medium">{sku.skuNumber}</p>
                    </div>
                  )}
                  {sku.isComposite && (
                    <div>
                      <label className="text-sm text-gray-500">类型</label>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700">
                        组合SKU
                      </Badge>
                    </div>
                  )}
                </div>
                {sku.createdAt && (
                  <div>
                    <label className="text-sm text-gray-500">创建时间</label>
                    <p className="font-medium">{format(new Date(sku.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 详细信息标签页 */}
      <Tabs defaultValue="items" className="w-full">
        <TabsList className="rounded-xl">
          <TabsTrigger value="items">
            <Package className="h-4 w-4 mr-2" />
            子SKU管理
          </TabsTrigger>
          <TabsTrigger value="sales">
            <TrendingUp className="h-4 w-4 mr-2" />
            销售与库存
          </TabsTrigger>
          <TabsTrigger value="inventory">
            <Warehouse className="h-4 w-4 mr-2" />
            汇总
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-4 space-y-4">
          <Card className="rounded-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">子SKU模板</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
                  添加子SKU
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {subSkuTemplates && subSkuTemplates.length > 0 ? (
                <>
                  {(showAllItems ? subSkuTemplates : subSkuTemplates.slice(0, 10)).map((template: any) => (
                    <SubSkuTemplateCard
                      key={template.id}
                      template={template}
                      onEdit={
                        template.__fallback
                          ? undefined
                          : () =>
                              setEditingTemplate({
                                ...template,
                                skuId: sku.id,
                                skuName: sku.name,
                              })
                      }
                      onToggleActive={
                        template.__fallback ? undefined : () => handleToggleTemplate(template)
                      }
                    />
                  ))}
                  {subSkuTemplates.length > 10 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-7 text-xs"
                      onClick={() => setShowAllItems((v) => !v)}
                    >
                      {showAllItems ? (
                        <>
                          <ChevronUp className="h-3 w-3 mr-1" />
                          收起
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3 mr-1" />
                          展开更多 ({subSkuTemplates.length - 10})
                        </>
                      )}
                    </Button>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">暂无子SKU模板</p>
              )}
            </CardContent>
          </Card>
          <NewSubSkuDialog
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            skuId={sku.id}
            defaultBrand={sku.brand}
            defaultCategoryName={sku.category?.name || null}
            onCreated={() => refetch()}
          />
          <EditSubSkuTemplateDialog
            open={!!editingTemplate}
            template={editingTemplate}
            onClose={() => setEditingTemplate(null)}
            onUpdated={() => {
              setEditingTemplate(null)
              refetch()
            }}
          />
          <CreateSaleDialog
            open={saleDialogOpen}
            onClose={() => setSaleDialogOpen(false)}
            onSuccess={() => {
              refetch()
            }}
            initialSkuId={skuId}
            navigationMode="stay"
          />
          <CreatePurchaseDialog
            open={purchaseDialogOpen}
            onClose={() => setPurchaseDialogOpen(false)}
            onSuccess={() => {
              refetch()
            }}
            initialSkuId={skuId}
            initialSkuName={sku.name}
            navigationMode="stay"
          />
        </TabsContent>

        <TabsContent value="sales" className="mt-4">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg">销售数据</CardTitle>
            </CardHeader>
            <CardContent>
              {sku.stats?.sales ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500">总销售额</label>
                      <p className="text-2xl font-bold">¥{sku.stats.sales.totalRevenue.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">利润率</label>
                      <p className="text-2xl font-bold text-green-600">{sku.stats.sales.profitRate.toFixed(1)}%</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">销售数量</label>
                      <p className="text-xl font-medium">{sku.stats.sales.totalQuantity}件</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">销售次数</label>
                      <p className="text-xl font-medium">{sku.stats.sales.salesCount}次</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">暂无销售数据</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="mt-4">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg">库存与采购</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <Card className="rounded-xl">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm text-gray-500">在库数量</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-2xl font-bold text-green-600">{sku.stats?.inventory?.inStockCount ?? 0}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm text-gray-500">在途数量</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-2xl font-bold">{sku.stats?.purchase?.totalQuantity ?? 0}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm text-gray-500">已售数量</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-2xl font-bold text-gray-700">{sku.stats?.inventory?.soldCount ?? 0}</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
