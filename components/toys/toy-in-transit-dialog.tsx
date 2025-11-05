"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ToyPurchaseOrder, PURCHASE_STATUS_LABELS } from "@/lib/toy-types";
import { useToast } from "@/hooks/use-toast";

interface ToyInTransitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  skuName: string;
  purchaseOrders: ToyPurchaseOrder[];
  onCompleteBatchInbound: (batchOrders: ToyPurchaseOrder[]) => void;
  onShipUnassignedBatch: (batch: string, totalShippingAmount: number, totalShippingWeight: number) => void;
}

export function ToyInTransitDialog({
  isOpen,
  onClose,
  skuName,
  purchaseOrders,
  onCompleteBatchInbound,
  onShipUnassignedBatch,
}: ToyInTransitDialogProps) {
  const { toast } = useToast();
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [shipBatch, setShipBatch] = useState("");
  const [totalShippingAmount, setTotalShippingAmount] = useState(0);
  const [totalShippingWeight, setTotalShippingWeight] = useState(0);
  const [loading, setLoading] = useState(false);

  // 按状态分组订单
  const domesticOrders = purchaseOrders.filter(order => order.status === "DOMESTIC_IN_TRANSIT");
  const japanOrders = purchaseOrders.filter(order => order.status === "JAPAN_IN_TRANSIT");

  const handleOrderSelect = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders([...selectedOrders, orderId]);
    } else {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    }
  };

  const handleCompleteInbound = async () => {
    const batchOrders = purchaseOrders.filter(order => selectedOrders.includes(order.id));
    if (batchOrders.length === 0) {
      toast({
        title: "提示",
        description: "请选择要入库的订单",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/toys/bulk-inbound", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderIds: selectedOrders,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "入库成功",
          description: data.message,
        });
        onCompleteBatchInbound(batchOrders);
        setSelectedOrders([]);
      } else {
        throw new Error(data.message || "入库失败");
      }
    } catch (error) {
      console.error("批量入库失败:", error);
      toast({
        title: "入库失败",
        description: error instanceof Error ? error.message : "请重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShipBatch = () => {
    if (shipBatch && totalShippingAmount > 0 && totalShippingWeight > 0) {
      onShipUnassignedBatch(shipBatch, totalShippingAmount, totalShippingWeight);
    }
  };

  const totalSelectedQuantity = purchaseOrders
    .filter(order => selectedOrders.includes(order.id))
    .reduce((sum, order) => sum + order.quantity, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>在途管理 - {skuName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 国内在途订单 */}
          {domesticOrders.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">国内在途订单</h3>
              <div className="space-y-2">
                {domesticOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-3 border rounded-lg bg-blue-50"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedOrders.includes(order.id)}
                        onCheckedChange={(checked) => handleOrderSelect(order.id, checked as boolean)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{order.domesticOrderNumber}</span>
                          <Badge variant="outline" className="bg-blue-500 text-white">
                            {PURCHASE_STATUS_LABELS[order.status]}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                          <div>数量: {order.quantity} 件</div>
                          <div>重量: {order.weight} kg</div>
                          <div>金额: ¥{Number(order.amount).toFixed(2)}</div>
                          <div>批次: {order.batch || "未分配"}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          发货时间: {new Date(order.shippingDate).toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 日本在途订单 */}
          {japanOrders.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">日本在途订单</h3>
              <div className="space-y-2">
                {japanOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-3 border rounded-lg bg-yellow-50"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedOrders.includes(order.id)}
                        onCheckedChange={(checked) => handleOrderSelect(order.id, checked as boolean)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{order.domesticOrderNumber}</span>
                          <Badge variant="outline" className="bg-yellow-500 text-white">
                            {PURCHASE_STATUS_LABELS[order.status]}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                          <div>数量: {order.quantity} 件</div>
                          <div>重量: {order.weight} kg</div>
                          <div>金额: ¥{Number(order.amount).toFixed(2)}</div>
                          <div>批次: {order.batch}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          发货时间: {new Date(order.shippingDate).toLocaleDateString('zh-CN')}
                          {order.shippingCost && (
                            <span> | 单个邮费: ¥{Number(order.shippingCost).toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 完成入库操作 */}
          {selectedOrders.length > 0 && (
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold mb-2">完成入库</h4>
              <p className="text-sm text-gray-600 mb-3">
                已选择 {selectedOrders.length} 个订单，共 {totalSelectedQuantity} 件商品
              </p>
              <Button onClick={handleCompleteInbound} className="bg-green-600 hover:bg-green-700" disabled={loading}>
                {loading ? "入库中..." : "确认入库"}
              </Button>
            </div>
          )}

          {/* 发货未分配批次 */}
          {domesticOrders.some(order => !order.batch) && (
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-semibold mb-3">发货未分配批次</h4>
              <div className="space-y-3">
                <div>
                  <Label>批次号</Label>
                  <Input
                    value={shipBatch}
                    onChange={(e) => setShipBatch(e.target.value)}
                    placeholder="例如：2025-10-10-A"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>总邮费（元）</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={totalShippingAmount || ""}
                      onChange={(e) => setTotalShippingAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>总重量（kg）</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={totalShippingWeight || ""}
                      onChange={(e) => setTotalShippingWeight(parseFloat(e.target.value) || 0)}
                      placeholder="0.0"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleShipBatch} 
                  disabled={!shipBatch || totalShippingAmount <= 0 || totalShippingWeight <= 0}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  确认发货
                </Button>
              </div>
            </div>
          )}

          {purchaseOrders.length === 0 && (
            <p className="text-center text-gray-500 py-8">暂无在途订单</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
