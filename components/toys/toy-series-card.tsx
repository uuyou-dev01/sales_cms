"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit, Package, ShoppingCart, TrendingDown, Info, Plus } from "lucide-react";
import { ToySeriesWithDetails, ToySKU, ToyPurchaseOrder, ToyInventoryBatch, ToySalesRecord } from "@/lib/toy-types";
import { ToySKUDetailDialog } from "./toy-sku-detail-dialog";
import { ToyInventoryAdjustDialog } from "./toy-inventory-adjust-dialog";
import { ToyPurchaseDialog } from "./toy-purchase-dialog";
import { ToySalesDialog } from "./toy-sales-dialog";
import { ToyInTransitDialog } from "./toy-in-transit-dialog";

interface ToySeriesCardProps {
  series: ToySeriesWithDetails;
  onSeriesUpdate: (series: ToySeriesWithDetails) => void;
  onEditClick: (series: ToySeriesWithDetails) => void;
}

export function ToySeriesCard({ series, onSeriesUpdate, onEditClick }: ToySeriesCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedSku, setSelectedSku] = useState<ToySKU | null>(null);
  const [dialogType, setDialogType] = useState<"adjust" | "purchase" | "sales" | "transit" | "detail" | null>(null);

  // 计算每个SKU的销售数量
  const getSkuSalesCount = (skuId: string) => {
    return series.characters
      .flatMap(char => char.skus)
      .flatMap(sku => sku.salesRecords)
      .filter(record => record.skuId === skuId)
      .reduce((sum, record) => sum + record.quantity, 0);
  };

  // 获取SKU的在途订单
  const getSkuInTransitOrders = (skuId: string): ToyPurchaseOrder[] => {
    return series.characters
      .flatMap(char => char.skus)
      .flatMap(sku => sku.purchaseOrders)
      .filter(order => order.skuId === skuId && order.status !== "JAPAN_ARRIVED");
  };

  const handleStockUpdate = (newStock: number) => {
    if (!selectedSku) return;
    
    const updatedSeries = {
      ...series,
      characters: series.characters.map(char => ({
        ...char,
        skus: char.skus.map(sku =>
          sku.id === selectedSku.id ? { ...sku, currentStock: newStock } : sku
        )
      }))
    };
    onSeriesUpdate(updatedSeries);
    setDialogType(null);
  };

  const handlePurchaseSave = (purchase: ToyPurchaseOrder) => {
    const updatedSeries = {
      ...series,
      characters: series.characters.map(char => ({
        ...char,
        skus: char.skus.map(sku =>
          sku.id === purchase.skuId 
            ? { ...sku, purchaseOrders: [...sku.purchaseOrders, purchase] }
            : sku
        )
      }))
    };
    onSeriesUpdate(updatedSeries);
    setDialogType(null);
  };

  const handleSalesSave = (quantity: number, amount: number, updatedBatches: ToyInventoryBatch[], cost: number, profit: number) => {
    if (!selectedSku) return;

    const newSalesRecord: ToySalesRecord = {
      id: Date.now().toString(),
      skuId: selectedSku.id,
      date: new Date().toISOString(),
      amount,
      quantity,
      cost,
      profit,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedSeries = {
      ...series,
      characters: series.characters.map(char => ({
        ...char,
        skus: char.skus.map(sku =>
          sku.id === selectedSku.id
            ? { 
                ...sku, 
                currentStock: sku.currentStock - quantity, 
                inventoryBatches: updatedBatches,
                salesRecords: [newSalesRecord, ...sku.salesRecords]
              }
            : sku
        )
      }))
    };

    onSeriesUpdate(updatedSeries);
    setDialogType(null);
  };

  const handleCompleteBatchInbound = (batchOrders: ToyPurchaseOrder[]) => {
    if (batchOrders.length === 0) return;

    const today = new Date().toISOString().split('T')[0];
    
    // 为每个订单创建库存批次，计算单个成本价（含邮费）
    const newBatches: ToyInventoryBatch[] = batchOrders.map(order => {
      const unitCostPrice = order.amount / order.quantity + (order.shippingCost || 0);
      return {
        id: `${Date.now()}-${order.id}`,
        skuId: order.skuId,
        quantity: order.quantity,
        inboundDate: today,
        purchaseOrderId: order.id,
        unitCostPrice,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    // 计算总入库数量
    const totalQuantity = batchOrders.reduce((sum, order) => sum + order.quantity, 0);
    const skuId = batchOrders[0].skuId;

    const updatedSeries = {
      ...series,
      characters: series.characters.map(char => ({
        ...char,
        skus: char.skus.map(sku =>
          sku.id === skuId
            ? {
                ...sku,
                currentStock: sku.currentStock + totalQuantity,
                inventoryBatches: [...sku.inventoryBatches, ...newBatches],
                purchaseOrders: sku.purchaseOrders.map(po => {
                  const isBatchOrder = batchOrders.find(o => o.id === po.id);
                  return isBatchOrder
                    ? { ...po, status: "JAPAN_ARRIVED" as const, arrivalTime: today }
                    : po;
                })
              }
            : sku
        )
      }))
    };

    onSeriesUpdate(updatedSeries);
    setDialogType(null);
  };

  const handleShipUnassignedBatch = (batch: string, totalShippingAmount: number, totalShippingWeight: number) => {
    if (!selectedSku) return;

    const today = new Date().toISOString().split('T')[0];
    
    // 获取该SKU未分配批次的订单
    const unassignedOrders = series.characters
      .flatMap(char => char.skus)
      .flatMap(sku => sku.purchaseOrders)
      .filter(order => order.skuId === selectedSku.id && order.status === "DOMESTIC_IN_TRANSIT" && !order.batch);

    // 计算每个订单的单个邮费
    const updatedOrders = unassignedOrders.map(order => {
      const shippingCost = totalShippingWeight > 0 
        ? (order.weight / totalShippingWeight) * totalShippingAmount / order.quantity
        : 0;
      
      return {
        ...order,
        batch,
        status: "JAPAN_IN_TRANSIT" as const,
        shippingDate: today,
        shippingCost,
        totalShippingAmount,
        totalShippingWeight,
      };
    });

    const updatedSeries = {
      ...series,
      characters: series.characters.map(char => ({
        ...char,
        skus: char.skus.map(sku =>
          sku.id === selectedSku.id
            ? {
                ...sku,
                purchaseOrders: sku.purchaseOrders.map(po => {
                  const updatedOrder = updatedOrders.find(o => o.id === po.id);
                  return updatedOrder || po;
                })
              }
            : sku
        )
      }))
    };

    onSeriesUpdate(updatedSeries);
    setDialogType(null);
  };

  const totalStock = series.characters
    .flatMap(char => char.skus)
    .reduce((sum, sku) => sum + sku.currentStock, 0);

  const allSKUs = series.characters.flatMap(char => char.skus);

  return (
    <>
      <Card 
        className="w-full overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => setIsDetailOpen(true)}
      >
        <div className="relative h-48 overflow-hidden">
          <img
            src={series.image || "https://images.unsplash.com/photo-1604257206125-c0d204cb1493?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibGluZCUyMGJveCUyMHRveXxlbnwxfHx8fDE3NjEyMzYzNDh8MA&ixlib=rb-4.1.0&q=80&w=1080"}
            alt={series.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEditClick(series);
              }}
            >
              <Edit className="w-4 h-4 mr-1" />
              编辑
            </Button>
          </div>
        </div>
        <CardHeader>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">{series.name}</h3>
            {series.description && (
              <p className="text-gray-600 text-sm">{series.description}</p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span>{allSKUs.length} 个SKU</span>
              </div>
              <span>总库存: {totalStock}</span>
            </div>

            {/* SKU状态预览 */}
            <div className="space-y-1">
              {allSKUs.slice(0, 3).map((sku) => {
                const salesCount = getSkuSalesCount(sku.id);
                return (
                  <div key={sku.id} className="flex items-center justify-between text-xs text-gray-600">
                    <span>{sku.name}</span>
                    <div className="flex items-center gap-3">
                      <span>库存: {sku.currentStock}</span>
                      <span className="text-blue-600">销售: {salesCount}</span>
                    </div>
                  </div>
                );
              })}
              {allSKUs.length > 3 && (
                <div className="text-xs text-gray-500">
                  还有 {allSKUs.length - 3} 个SKU...
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 详情对话框 */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{series.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* 库存部分 */}
            <div>
              <h3 className="mb-4 text-lg font-semibold">库存管理</h3>
              <div className="space-y-3">
                {allSKUs.map((sku) => {
                  const inTransit = getSkuInTransitOrders(sku.id).reduce(
                    (sum, order) => sum + order.quantity,
                    0
                  );
                  return (
                    <div
                      key={sku.id}
                      className="p-3 bg-gray-50 rounded-lg space-y-2"
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={sku.image || "https://images.unsplash.com/photo-1604257206125-c0d204cb1493?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibGluZCUyMGJveCUyMHRveXxlbnwxfHx8fDE3NjEyMzYzNDh8MA&ixlib=rb-4.1.0&q=80&w=1080"}
                          alt={sku.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{sku.name}</span>
                            <span className="text-sm text-gray-500">¥{sku.suggestedPrice}</span>
                            {inTransit > 0 && (
                              <Badge 
                                variant="outline" 
                                className="text-xs cursor-pointer hover:bg-blue-100 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSku(sku);
                                  setDialogType("transit");
                                }}
                              >
                                在途: {inTransit}
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm text-gray-600">库存：{sku.currentStock}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSku(sku);
                            setDialogType("adjust");
                          }}
                        >
                          调整库存
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSku(sku);
                            setDialogType("sales");
                          }}
                        >
                          <ShoppingCart className="w-4 h-4 mr-1" />
                          销售
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSku(sku);
                            setDialogType("purchase");
                          }}
                        >
                          <TrendingDown className="w-4 h-4 mr-1" />
                          采购
                        </Button>
                        {inTransit > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => {
                              setSelectedSku(sku);
                              setDialogType("transit");
                            }}
                          >
                            <Package className="w-4 h-4 mr-1" />
                            查看在途
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                          onClick={() => {
                            setSelectedSku(sku);
                            setDialogType("detail");
                          }}
                        >
                          <Info className="w-4 h-4 mr-1" />
                          详情
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 销售数据部分 */}
            <div>
              <h3 className="mb-4 text-lg font-semibold">销售数据</h3>
              <div className="space-y-2">
                {allSKUs.flatMap(sku => sku.salesRecords).length > 0 ? (
                  allSKUs
                    .flatMap(sku => sku.salesRecords)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 10)
                    .map((record) => (
                      <div
                        key={record.id}
                        className="p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-4">
                            <span className="text-blue-900 font-medium">
                              {allSKUs.find(sku => sku.id === record.skuId)?.name}
                            </span>
                            <span className="text-sm text-gray-600">
                              {new Date(record.date).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                          <span className="text-sm text-gray-600">{record.quantity} 件</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-gray-500">销售额</p>
                            <p className="text-blue-900">¥{record.amount.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">成本</p>
                            <p className="text-orange-700">¥{record.cost.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">利润</p>
                            <p className={record.profit >= 0 ? "text-green-700" : "text-red-600"}>
                              ¥{record.profit.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-gray-500 p-3">暂无销售数据</p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 调整库存对话框 */}
      {selectedSku && dialogType === "adjust" && (
        <ToyInventoryAdjustDialog
          isOpen={true}
          onClose={() => setDialogType(null)}
          skuName={selectedSku.name}
          currentStock={selectedSku.currentStock}
          inTransitOrders={getSkuInTransitOrders(selectedSku.id)}
          onSave={handleStockUpdate}
          onViewInTransit={() => setDialogType("transit")}
        />
      )}

      {/* 采购对话框 */}
      {selectedSku && dialogType === "purchase" && (
        <ToyPurchaseDialog
          isOpen={true}
          onClose={() => setDialogType(null)}
          skuId={selectedSku.id}
          skuName={selectedSku.name}
          onSave={handlePurchaseSave}
        />
      )}

      {/* 销售对话框 */}
      {selectedSku && dialogType === "sales" && (
        <ToySalesDialog
          isOpen={true}
          onClose={() => setDialogType(null)}
          skuName={selectedSku.name}
          skuPrice={selectedSku.suggestedPrice}
          currentStock={selectedSku.currentStock}
          batches={selectedSku.inventoryBatches || []}
          onSave={handleSalesSave}
        />
      )}

      {/* 在途详情对话框 */}
      {selectedSku && dialogType === "transit" && (
        <ToyInTransitDialog
          isOpen={true}
          onClose={() => setDialogType(null)}
          skuName={selectedSku.name}
          purchaseOrders={getSkuInTransitOrders(selectedSku.id)}
          onCompleteBatchInbound={handleCompleteBatchInbound}
          onShipUnassignedBatch={handleShipUnassignedBatch}
        />
      )}

      {/* SKU详情对话框 */}
      {selectedSku && dialogType === "detail" && (
        <ToySKUDetailDialog
          isOpen={true}
          onClose={() => setDialogType(null)}
          sku={selectedSku}
          purchaseOrders={selectedSku.purchaseOrders || []}
          salesRecords={selectedSku.salesRecords || []}
        />
      )}
    </>
  );
}
