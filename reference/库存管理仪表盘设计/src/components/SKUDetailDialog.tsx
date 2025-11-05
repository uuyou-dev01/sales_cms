import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Calendar, DollarSign, Package, TrendingUp, TrendingDown } from "lucide-react";
import type { SKU, PurchaseOrder, SalesRecord } from "../App";

interface SKUDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sku: SKU;
  purchaseOrders: PurchaseOrder[];
  salesRecords: SalesRecord[];
}

export function SKUDetailDialog({
  isOpen,
  onClose,
  sku,
  purchaseOrders,
  salesRecords,
}: SKUDetailDialogProps) {
  // 计算平均售价
  const calculateAverageSellingPrice = () => {
    if (salesRecords.length === 0) return 0;
    const totalAmount = salesRecords.reduce((sum, record) => sum + record.amount, 0);
    const totalQuantity = salesRecords.reduce((sum, record) => sum + record.quantity, 0);
    return totalQuantity > 0 ? totalAmount / totalQuantity : 0;
  };

  // 计算平均成本价
  const calculateAverageCostPrice = () => {
    if (sku.batches.length === 0) return sku.costPrice;
    const totalCost = sku.batches.reduce((sum, batch) => sum + (batch.quantity * batch.unitCostPrice), 0);
    const totalQuantity = sku.batches.reduce((sum, batch) => sum + batch.quantity, 0);
    return totalQuantity > 0 ? totalCost / totalQuantity : sku.costPrice;
  };

  // 计算总利润
  const calculateTotalProfit = () => {
    return salesRecords.reduce((sum, record) => sum + record.profit, 0);
  };

  const averageSellingPrice = calculateAverageSellingPrice();
  const averageCostPrice = calculateAverageCostPrice();
  const totalProfit = calculateTotalProfit();
  const totalSales = salesRecords.reduce((sum, record) => sum + record.amount, 0);
  const totalSalesQuantity = salesRecords.reduce((sum, record) => sum + record.quantity, 0);

  // 获取该SKU的采购订单
  const skuPurchaseOrders = purchaseOrders.filter(order => order.skuId === sku.id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>SKU 详情 - {sku.name}</DialogTitle>
          <DialogDescription>
            查看该SKU的详细统计信息
          </DialogDescription>
        </DialogHeader>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-gray-600">当前库存</p>
            </div>
            <p className="text-blue-900">{sku.stock} 件</p>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <p className="text-xs text-gray-600">建议售价</p>
            </div>
            <p className="text-green-900">¥{sku.price.toFixed(2)}</p>
          </div>

          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-orange-600" />
              <p className="text-xs text-gray-600">收货价格</p>
            </div>
            <p className="text-orange-900">¥{sku.costPrice.toFixed(2)}</p>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-purple-600" />
              <p className="text-xs text-gray-600">平均成本</p>
            </div>
            <p className="text-purple-900">¥{averageCostPrice.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-indigo-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">平均售价</p>
            <p className="text-indigo-900">¥{averageSellingPrice.toFixed(2)}</p>
          </div>

          <div className="p-4 bg-teal-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">总销售额</p>
            <p className="text-teal-900">¥{totalSales.toFixed(2)}</p>
          </div>

          <div className="p-4 bg-emerald-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">总利润</p>
            <p className={totalProfit >= 0 ? "text-emerald-900" : "text-red-600"}>
              ¥{totalProfit.toFixed(2)}
            </p>
          </div>
        </div>

        {/* 详细信息标签页 */}
        <Tabs defaultValue="purchase" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="purchase">采购记录</TabsTrigger>
            <TabsTrigger value="batch">库存批次</TabsTrigger>
            <TabsTrigger value="sales">销售记录</TabsTrigger>
          </TabsList>

          <TabsContent value="purchase" className="space-y-3 max-h-96 overflow-y-auto">
            {skuPurchaseOrders.length > 0 ? (
              skuPurchaseOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-3 border rounded-lg space-y-2 bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{order.domesticOrderNumber}</span>
                      <Badge className={
                        order.status === "日本到达" ? "bg-green-500" :
                        order.status === "日本在途" ? "bg-yellow-500" :
                        "bg-blue-500"
                      }>
                        {order.status}
                      </Badge>
                    </div>
                    <span className="text-sm text-gray-600">{order.quantity} 件</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600">
                    <div>
                      <span className="text-gray-500">批次：</span>
                      <span>{order.batch || "未分配"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">重量：</span>
                      <span>{order.weight} kg</span>
                    </div>
                    <div>
                      <span className="text-gray-500">金额：</span>
                      <span>¥{order.amount.toFixed(2)}</span>
                    </div>
                    {order.shippingCost && (
                      <div>
                        <span className="text-gray-500">单个邮费：</span>
                        <span>¥{order.shippingCost.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>发货：{order.shippingDate}</span>
                    {order.arrivalTime && <span>| 到货：{order.arrivalTime}</span>}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">暂无采购记录</p>
            )}
          </TabsContent>

          <TabsContent value="batch" className="space-y-2 max-h-96 overflow-y-auto">
            {sku.batches.length > 0 ? (
              sku.batches
                .sort((a, b) => new Date(a.inboundDate).getTime() - new Date(b.inboundDate).getTime())
                .map((batch) => (
                  <div
                    key={batch.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-sm">{batch.inboundDate}</p>
                        <p className="text-xs text-gray-500">
                          {batch.purchaseOrderId ? "采购入库" : "初始库存"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{batch.quantity} 件</p>
                      <p className="text-xs text-gray-500">¥{batch.unitCostPrice.toFixed(2)}/件</p>
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-center text-gray-500 py-8">暂无库存批次</p>
            )}
          </TabsContent>

          <TabsContent value="sales" className="space-y-2 max-h-96 overflow-y-auto">
            {salesRecords.length > 0 ? (
              salesRecords.map((record) => (
                <div
                  key={record.id}
                  className="p-3 border rounded-lg bg-green-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{record.date}</span>
                    </div>
                    <span className="text-sm">{record.quantity} 件</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">销售额</p>
                      <p className="text-green-700">¥{record.amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">成本</p>
                      <p className="text-orange-700">¥{record.cost.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">利润</p>
                      <p className={record.profit >= 0 ? "text-emerald-700" : "text-red-600"}>
                        ¥{record.profit.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">暂无销售记录</p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
