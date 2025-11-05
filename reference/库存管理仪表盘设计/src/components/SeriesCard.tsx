import { useState } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Edit, Package, ShoppingCart, TrendingDown, Info } from "lucide-react";
import { InventoryAdjustDialog } from "./InventoryAdjustDialog";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { PurchaseDialog } from "./PurchaseDialog";
import { SalesDialog } from "./SalesDialog";
import { InTransitDialog } from "./InTransitDialog";
import { SKUDetailDialog } from "./SKUDetailDialog";
import type { Series, SKU, PurchaseOrder, InventoryBatch, SalesRecord } from "../App";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Badge } from "./ui/badge";

interface SeriesCardProps {
  series: Series;
  onSeriesUpdate: (series: Series) => void;
  onEditClick: (series: Series) => void;
}

export function SeriesCard({ series, onSeriesUpdate, onEditClick }: SeriesCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedSku, setSelectedSku] = useState<SKU | null>(null);
  const [dialogType, setDialogType] = useState<"adjust" | "purchase" | "sales" | "transit" | "detail" | null>(null);

  // 计算每个SKU的销售数量
  const getSkuSalesCount = (skuId: string) => {
    return series.salesRecords
      .filter(record => record.skuId === skuId)
      .reduce((sum, record) => sum + record.quantity, 0);
  };

  // 获取SKU的在途订单
  const getSkuInTransitOrders = (skuId: string): PurchaseOrder[] => {
    return series.purchaseOrders.filter(
      order => order.skuId === skuId && order.status !== "日本到达"
    );
  };

  const handleStockUpdate = (newStock: number) => {
    if (!selectedSku) return;
    
    const updatedSeries = {
      ...series,
      skus: series.skus.map(sku =>
        sku.id === selectedSku.id ? { ...sku, stock: newStock } : sku
      ),
    };
    onSeriesUpdate(updatedSeries);
    setDialogType(null);
  };

  const handlePurchaseSave = (purchase: PurchaseOrder) => {
    const updatedSeries = {
      ...series,
      purchaseOrders: [...series.purchaseOrders, purchase],
    };
    onSeriesUpdate(updatedSeries);
    setDialogType(null);
  };

  const handleSalesSave = (quantity: number, amount: number, updatedBatches: InventoryBatch[], cost: number, profit: number) => {
    if (!selectedSku) return;

    const newSalesRecord: SalesRecord = {
      id: Date.now().toString(),
      skuId: selectedSku.id,
      skuName: selectedSku.name,
      date: new Date().toLocaleDateString('zh-CN'),
      amount,
      quantity,
      cost,
      profit,
    };

    const updatedSeries = {
      ...series,
      skus: series.skus.map(sku =>
        sku.id === selectedSku.id
          ? { ...sku, stock: sku.stock - quantity, batches: updatedBatches }
          : sku
      ),
      salesRecords: [newSalesRecord, ...series.salesRecords], // 最新的在最上面
    };

    onSeriesUpdate(updatedSeries);
    setDialogType(null);
  };

  const handleCompleteBatchInbound = (batchOrders: PurchaseOrder[]) => {
    if (batchOrders.length === 0) return;

    const today = new Date().toISOString().split('T')[0];
    
    // 为每个订单创建库存批次，计算单个成本价（含邮费）
    const newBatches: InventoryBatch[] = batchOrders.map(order => {
      const unitCostPrice = order.amount / order.quantity + (order.shippingCost || 0);
      return {
        id: `${Date.now()}-${order.id}`,
        skuId: order.skuId,
        quantity: order.quantity,
        inboundDate: today,
        purchaseOrderId: order.id,
        unitCostPrice,
      };
    });

    // 计算总入库数量
    const totalQuantity = batchOrders.reduce((sum, order) => sum + order.quantity, 0);
    const skuId = batchOrders[0].skuId;

    const updatedSeries = {
      ...series,
      skus: series.skus.map(sku =>
        sku.id === skuId
          ? {
              ...sku,
              stock: sku.stock + totalQuantity,
              batches: [...sku.batches, ...newBatches],
            }
          : sku
      ),
      purchaseOrders: series.purchaseOrders.map(po => {
        const isBatchOrder = batchOrders.find(o => o.id === po.id);
        return isBatchOrder
          ? { ...po, status: "日本到达" as const, arrivalTime: today }
          : po;
      }),
    };

    onSeriesUpdate(updatedSeries);
    setDialogType(null);
  };

  const handleShipUnassignedBatch = (batch: string, totalShippingAmount: number, totalShippingWeight: number) => {
    if (!selectedSku) return;

    const today = new Date().toISOString().split('T')[0];
    
    // 获取该SKU未分配批次的订单
    const unassignedOrders = series.purchaseOrders.filter(
      order => order.skuId === selectedSku.id && order.status === "国内在途" && !order.batch
    );

    // 计算每个订单的单个邮费
    const updatedOrders = unassignedOrders.map(order => {
      const shippingCost = totalShippingWeight > 0 
        ? (order.weight / totalShippingWeight) * totalShippingAmount / order.quantity
        : 0;
      
      return {
        ...order,
        batch,
        status: "日本在途" as const,
        shippingDate: today,
        shippingCost,
        totalShippingAmount,
        totalShippingWeight,
      };
    });

    const updatedSeries = {
      ...series,
      purchaseOrders: series.purchaseOrders.map(po => {
        const updatedOrder = updatedOrders.find(o => o.id === po.id);
        return updatedOrder || po;
      }),
    };

    onSeriesUpdate(updatedSeries);
    setDialogType(null);
  };

  const totalStock = series.skus.reduce((sum, sku) => sum + sku.stock, 0);

  return (
    <>
      <Card 
        className="w-full overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => setIsDetailOpen(true)}
      >
        <div className="relative h-48 overflow-hidden">
          <ImageWithFallback
            src={series.coverImage}
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
            <h3>{series.name}</h3>
            {series.description && (
              <p className="text-gray-600">{series.description}</p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span>{series.skus.length} 个SKU</span>
              </div>
              <span>总库存: {totalStock}</span>
            </div>

            {/* SKU状态预览 */}
            <div className="space-y-1">
              {series.skus.map((sku) => {
                const salesCount = getSkuSalesCount(sku.id);
                return (
                  <div key={sku.id} className="flex items-center justify-between text-xs text-gray-600">
                    <span>{sku.name}</span>
                    <div className="flex items-center gap-3">
                      <span>库存: {sku.stock}</span>
                      <span className="text-blue-600">销售: {salesCount}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 详情对话框 */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{series.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* 库存部分 */}
            <div>
              <h3 className="mb-4">库存</h3>
              <div className="space-y-3">
                {series.skus.map((sku) => {
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
                        <ImageWithFallback
                          src={sku.imageUrl}
                          alt={sku.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span>{sku.name}</span>
                            <span className="text-sm text-gray-500">¥{sku.price}</span>
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
                          <span className="text-sm text-gray-600">库存：{sku.stock}</span>
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
                          调整��存
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
              <h3 className="mb-4">销售数据</h3>
              <div className="space-y-2">
                {series.salesRecords.length > 0 ? (
                  series.salesRecords.map((record) => (
                    <div
                      key={record.id}
                      className="p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-4">
                          <span className="text-blue-900">{record.skuName}</span>
                          <span className="text-sm text-gray-600">{record.date}</span>
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
        <InventoryAdjustDialog
          isOpen={true}
          onClose={() => setDialogType(null)}
          skuName={selectedSku.name}
          currentStock={selectedSku.stock}
          inTransitOrders={getSkuInTransitOrders(selectedSku.id)}
          onSave={handleStockUpdate}
          onViewInTransit={() => setDialogType("transit")}
        />
      )}

      {/* 采购对话框 */}
      {selectedSku && dialogType === "purchase" && (
        <PurchaseDialog
          isOpen={true}
          onClose={() => setDialogType(null)}
          skuId={selectedSku.id}
          skuName={selectedSku.name}
          onSave={handlePurchaseSave}
        />
      )}

      {/* 销售对话框 */}
      {selectedSku && dialogType === "sales" && (
        <SalesDialog
          isOpen={true}
          onClose={() => setDialogType(null)}
          skuName={selectedSku.name}
          skuPrice={selectedSku.price}
          currentStock={selectedSku.stock}
          batches={selectedSku.batches}
          onSave={handleSalesSave}
        />
      )}

      {/* 在途详情对话框 */}
      {selectedSku && dialogType === "transit" && (
        <InTransitDialog
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
        <SKUDetailDialog
          isOpen={true}
          onClose={() => setDialogType(null)}
          sku={selectedSku}
          purchaseOrders={series.purchaseOrders}
          salesRecords={series.salesRecords.filter(r => r.skuId === selectedSku.id)}
        />
      )}
    </>
  );
}
