import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { CheckCircle, Package, Calendar, Weight, DollarSign, Truck } from "lucide-react";
import { ShipmentDialog } from "./ShipmentDialog";
import type { PurchaseOrder } from "../App";

interface BatchGroup {
  batch: string;
  orders: PurchaseOrder[];
  totalQuantity: number;
  totalWeight: number;
  totalAmount: number;
  shippingDate: string;
}

interface InTransitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  skuName: string;
  purchaseOrders: PurchaseOrder[];
  onCompleteBatchInbound: (batchOrders: PurchaseOrder[]) => void;
  onShipUnassignedBatch: (batch: string, totalShippingAmount: number, totalShippingWeight: number) => void;
}

export function InTransitDialog({
  isOpen,
  onClose,
  skuName,
  purchaseOrders,
  onCompleteBatchInbound,
  onShipUnassignedBatch,
}: InTransitDialogProps) {
  const [showShipmentDialog, setShowShipmentDialog] = useState(false);
  const [unassignedOrders, setUnassignedOrders] = useState<PurchaseOrder[]>([]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "国内在途":
        return "bg-blue-500";
      case "日本在途":
        return "bg-yellow-500";
      case "日本到达":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  // 按批次分组
  const groupByBatch = (): BatchGroup[] => {
    const groups = new Map<string, PurchaseOrder[]>();
    
    purchaseOrders.forEach(order => {
      const batch = order.batch || "未分配批次";
      if (!groups.has(batch)) {
        groups.set(batch, []);
      }
      groups.get(batch)!.push(order);
    });

    return Array.from(groups.entries()).map(([batch, orders]) => {
      const totalQuantity = orders.reduce((sum, o) => sum + o.quantity, 0);
      const totalWeight = orders.reduce((sum, o) => sum + o.weight, 0);
      const totalAmount = orders.reduce((sum, o) => sum + o.amount, 0);
      const shippingDate = orders[0]?.shippingDate || "";

      return {
        batch,
        orders,
        totalQuantity,
        totalWeight,
        totalAmount,
        shippingDate,
      };
    }).sort((a, b) => a.batch.localeCompare(b.batch));
  };

  const batchGroups = groupByBatch();

  const handleBatchInbound = (batchGroup: BatchGroup) => {
    if (confirm(`确认将批次 ${batchGroup.batch} 的所有订单（共${batchGroup.totalQuantity}件）入库？`)) {
      onCompleteBatchInbound(batchGroup.orders);
    }
  };

  const handleShipUnassignedBatch = (batchGroup: BatchGroup) => {
    setUnassignedOrders(batchGroup.orders);
    setShowShipmentDialog(true);
  };

  const handleShipmentConfirm = (batch: string, totalShippingAmount: number, totalShippingWeight: number) => {
    onShipUnassignedBatch(batch, totalShippingAmount, totalShippingWeight);
    setShowShipmentDialog(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>在途详情 - {skuName}</DialogTitle>
          <DialogDescription>
            查看和管理该SKU的在途订单
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {batchGroups.length > 0 ? (
            batchGroups.map((batchGroup) => (
              <div
                key={batchGroup.batch}
                className="p-4 border-2 rounded-lg space-y-3 bg-gradient-to-r from-blue-50 to-indigo-50"
              >
                {/* 批次头部 */}
                <div className="flex items-start justify-between pb-3 border-b">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-indigo-600" />
                      <h4 className="text-indigo-900">批次: {batchGroup.batch}</h4>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>发货: {batchGroup.shippingDate}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {batchGroup.batch === "未分配批次" && batchGroup.orders.every(o => o.status === "国内在途") ? (
                      <Button
                        onClick={() => handleShipUnassignedBatch(batchGroup)}
                        size="sm"
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <Truck className="w-4 h-4 mr-2" />
                        发货
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleBatchInbound(batchGroup)}
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        一键入库
                      </Button>
                    )}
                  </div>
                </div>

                {/* 批次汇总 */}
                <div className="grid grid-cols-3 gap-3 p-3 bg-white rounded-lg">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">总数量</p>
                    <p className="text-indigo-900">{batchGroup.totalQuantity} 件</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">总重量</p>
                    <p className="text-indigo-900">{batchGroup.totalWeight.toFixed(1)} kg</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">总金额</p>
                    <p className="text-indigo-900">¥{batchGroup.totalAmount.toFixed(2)}</p>
                  </div>
                </div>

                {/* 订单详情 */}
                <div className="space-y-2">
                  <p className="text-xs text-gray-600">包含订单:</p>
                  {batchGroup.orders.map((order) => (
                    <div
                      key={order.id}
                      className="p-3 bg-white rounded border space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{order.domesticOrderNumber}</span>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </div>
                        <span className="text-sm text-gray-600">{order.quantity} 件</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Weight className="w-3 h-3" />
                          <span>{order.weight} kg</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          <span>¥{order.amount}</span>
                        </div>
                        {order.arrivalTime && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>预计: {order.arrivalTime}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>暂无在途数据</p>
            </div>
          )}
        </div>
      </DialogContent>

      <ShipmentDialog
        isOpen={showShipmentDialog}
        onClose={() => setShowShipmentDialog(false)}
        orders={unassignedOrders}
        onConfirm={handleShipmentConfirm}
      />
    </Dialog>
  );
}
