'use client'

import React from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useItemDetail, useItemStockAdjustment } from '@/src/modules/sku/hooks/useItemDetail'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Edit } from 'lucide-react'
import { useSWRConfig } from 'swr'

const numberFormatter = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 })

interface AdjustDialogProps {
  open: boolean
  onClose: () => void
  itemId: string
}

function AdjustStockDialog({ open, onClose, itemId }: AdjustDialogProps) {
  const [mode, setMode] = React.useState<'set' | 'add' | 'subtract'>('set')
  const [quantity, setQuantity] = React.useState<number>(0)
  const [reason, setReason] = React.useState('')
  const [remarks, setRemarks] = React.useState('')

  const adjustMutation = useItemStockAdjustment(itemId)

  const handleSubmit = async () => {
    if (quantity < 0) return
    await adjustMutation.mutateAsync({ mode, quantity, reason, remarks })
    setQuantity(0)
    setReason('')
    setRemarks('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>调整库存</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>调整方式</Label>
            <Select value={mode} onValueChange={(v: 'set' | 'add' | 'subtract') => setMode(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="set">设置为指定数量</SelectItem>
                <SelectItem value="add">增加库存</SelectItem>
                <SelectItem value="subtract">减少库存</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{mode === 'set' ? '目标库存' : '调整数量'}</Label>
            <Input
              type="number"
              min={0}
              value={String(quantity)}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>原因（可选）</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="如：初次盘点" />
          </div>
          <div className="space-y-2">
            <Label>备注</Label>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSubmit} disabled={adjustMutation.isLoading}>
            {adjustMutation.isLoading ? '提交中...' : '提交'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AddAdditionalCostDialog({ open, onClose, itemId, currentCost, onSuccess }: { open: boolean; onClose: () => void; itemId: string; currentCost: number; onSuccess: () => void }) {
  const [amount, setAmount] = React.useState('')
  const [note, setNote] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async () => {
     if (!amount || isNaN(Number(amount))) return
     setLoading(true)
     try {
         const newCost = (currentCost || 0) + Number(amount)
         const res = await fetch(`/api/inventory/items/${itemId}`, {
             method: 'PUT',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ additionalCostCNY: newCost })
         })
         if (res.ok) {
             onSuccess()
             onClose()
             setAmount('')
             setNote('')
         }
     } catch(e) {
         console.error(e)
     } finally {
         setLoading(false)
     }
  }
  
  return (
     <Dialog open={open} onOpenChange={onClose}>
       <DialogContent>
         <DialogHeader><DialogTitle>增加杂费成本 (CNY)</DialogTitle></DialogHeader>
         <div className="space-y-4">
             <div className="text-sm text-muted-foreground">当前杂费: {currentCost || 0}</div>
             <div className="space-y-2">
                <Label>追加金额</Label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="输入追加金额 (例如: 20)" />
             </div>
             <div className="space-y-2">
                <Label>备注</Label>
                <Input value={note} onChange={e => setNote(e.target.value)} placeholder="例如: 退货运费" />
             </div>
         </div>
         <DialogFooter>
            <Button onClick={handleSubmit} disabled={loading}>确认追加</Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
  )
}

export function ItemDetailDrawer({ itemId, open, onClose }: { itemId: string | null; open: boolean; onClose: () => void }) {
  const { data, isLoading } = useItemDetail(itemId || undefined)
  const [adjustOpen, setAdjustOpen] = React.useState(false)
  const [addCostOpen, setAddCostOpen] = React.useState(false)
  const { mutate } = useSWRConfig()

  const handleCostSuccess = () => {
      if (itemId) mutate(['item-detail', itemId])
  }

  const item = data?.item
  const stock = data?.stock
  const sales = data?.sales
  const purchase = data?.purchase

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto h-[85vh]">
        <SheetHeader>
          <SheetTitle>子SKU详情</SheetTitle>
        </SheetHeader>

        {!itemId ? (
          <div className="py-8 text-center text-sm text-gray-500">未选择子SKU</div>
        ) : isLoading ? (
          <div className="py-8 text-center text-sm text-gray-500">加载中...</div>
        ) : !item ? (
          <div className="py-8 text-center text-sm text-gray-500">子SKU不存在</div>
        ) : (
          <div className="mt-4 space-y-4">
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-lg">基础信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500 block text-xs">名称</span>
                    <span className="font-medium text-gray-900">{item.itemName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Item ID</span>
                    <span className="font-mono text-xs text-gray-800">{item.itemId}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">尺码 / 变体</span>
                    <span>{item.itemSize || '均码'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">成色</span>
                    <Badge variant="outline">{item.itemCondition || '全新'}</Badge>
                  </div>
                  {item.toyCharacterName && (
                    <div>
                      <span className="text-gray-500 block text-xs">角色</span>
                      <span>{item.toyCharacterName}</span>
                    </div>
                  )}
                  {item.itemColor && (
                    <div>
                      <span className="text-gray-500 block text-xs">颜色</span>
                      <span>{item.itemColor}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500 block text-xs">品牌</span>
                    <span>{item.itemBrand || item.sku?.brand || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">分类</span>
                    <span>{item.sku?.category?.name || '其他'}</span>
                  </div>
                </div>
                {item.itemRemarks && (
                  <div>
                    <span className="text-gray-500 block text-xs">备注</span>
                    <p>{item.itemRemarks}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-lg">成本信息 (CNY)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <span className="text-gray-500 block text-xs">采购成本</span>
                        <span className="font-medium text-gray-900">{(item.purchaseCostCNY || 0).toFixed(2)}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 block text-xs">物流分摊</span>
                        <span className="font-medium text-gray-900">{(item.shippingCostCNY || 0).toFixed(2)}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 block text-xs">杂费/异常</span>
                        <div className="flex items-center gap-2">
                             <span className="font-medium text-gray-900">{(item.additionalCostCNY || 0).toFixed(2)}</span>
                             <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setAddCostOpen(true)}>
                               <Edit className="h-3 w-3" />
                             </Button>
                        </div>
                    </div>
                </div>
                <div className="pt-2 border-t mt-2 flex justify-between items-center">
                     <span className="text-gray-500 text-xs">总成本</span>
                     <span className="font-bold text-lg text-gray-900">
                        {((item.purchaseCostCNY || 0) + (item.shippingCostCNY || 0) + (item.additionalCostCNY || 0)).toFixed(2)}
                     </span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">库存状态</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setAdjustOpen(true)}>调整库存</Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-gray-500 block text-xs">在库数量</span>
                    <p className="text-2xl font-bold text-green-600">{stock?.inStock ?? 0}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">已售数量</span>
                    <p className="text-2xl font-bold text-gray-700">{stock?.sold ?? 0}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">在途数量</span>
                    <p className="text-2xl font-bold">{stock?.inTransit ?? 0}</p>
                  </div>
                </div>
                {stock?.lastAdjustment && (
                  <div className="mt-4 text-xs text-gray-500">
                    最近调整：{format(new Date(stock.lastAdjustment.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}，库存设为 {stock.lastAdjustment.newStock}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-lg">销售摘要</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sales?.totalQuantity ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-500 block text-xs">总销售额</span>
                        <p className="text-2xl font-bold text-gray-900">
                          ¥{numberFormatter.format(sales.totalRevenue || 0)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-xs">总利润</span>
                        <p className="text-2xl font-bold text-green-600">
                          ¥{numberFormatter.format(sales.totalProfit || 0)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-xs">平均利润率</span>
                        <p className="text-xl font-semibold text-green-600">
                          {numberFormatter.format(sales.profitRate || 0)}%
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-xs">累计销量</span>
                        <p className="text-xl font-semibold">{sales.totalQuantity} 件</p>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs mb-2">最近销售</span>
                      <div className="space-y-2 text-xs text-gray-600">
                        {sales.recent.map((detail: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between border rounded-md px-3 py-2">
                            <div>
                              {detail.transaction?.soldDate
                                ? format(new Date(detail.transaction.soldDate), 'yyyy-MM-dd HH:mm', { locale: zhCN })
                                : '未记录时间'}
                            </div>
                            <div>
                              ¥{numberFormatter.format(
                                detail.transaction?.soldPrice
                                  ? Number(detail.transaction.soldPrice)
                                  : detail.unitPrice
                                  ? Number(detail.unitPrice)
                                  : 0,
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">暂无销售记录</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-lg">采购信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                {purchase ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-500 block text-xs">采购单号</span>
                        <span>{purchase.order?.orderNumber || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-xs">采购数量</span>
                        <span>{purchase.detail.quantity ?? '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-xs">单价</span>
                        <span>
                          {purchase.detail.unitPrice
                            ? `¥${Number(purchase.detail.unitPrice).toFixed(2)}`
                            : '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-xs">在途数量</span>
                        <span>{stock?.inTransit ?? 0}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">暂无采购记录</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-lg">库存调整历史</CardTitle>
              </CardHeader>
              <CardContent>
                {stock?.adjustments && stock.adjustments.length > 0 ? (
                  <div className="space-y-2 text-xs text-gray-600">
                    {stock.adjustments.map((adj: any) => (
                      <div key={adj.id} className="border rounded-md px-3 py-2">
                        <div className="flex justify-between">
                          <span>{format(new Date(adj.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}</span>
                          <Badge variant="outline">{adj.adjustmentType}</Badge>
                        </div>
                        <div className="mt-1">
                          调整：{adj.previousStock} → {adj.newStock}（变化 {adj.quantity >= 0 ? '+' : ''}{adj.quantity}）
                        </div>
                        {adj.reason && <div className="text-gray-500 mt-1">原因：{adj.reason}</div>}
                        {adj.remarks && <div className="text-gray-400 mt-1">备注：{adj.remarks}</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">暂无调整记录</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {itemId && (
          <AdjustStockDialog open={adjustOpen} onClose={() => setAdjustOpen(false)} itemId={itemId} />
        )}
        {item && (
            <AddAdditionalCostDialog 
                open={addCostOpen} 
                onClose={() => setAddCostOpen(false)} 
                itemId={item.itemId} 
                currentCost={item.additionalCostCNY} 
                onSuccess={handleCostSuccess} 
            />
        )}
      </SheetContent>
    </Sheet>
  )
}

export default ItemDetailDrawer

