import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import type { PurchaseOrder } from "../App";

interface ShipmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orders: PurchaseOrder[];
  onConfirm: (batch: string, totalShippingAmount: number, totalShippingWeight: number) => void;
}

export function ShipmentDialog({
  isOpen,
  onClose,
  orders,
  onConfirm,
}: ShipmentDialogProps) {
  const [batch, setBatch] = useState("");
  const [totalShippingAmount, setTotalShippingAmount] = useState(0);
  const [totalShippingWeight, setTotalShippingWeight] = useState(0);

  // 计算总数量和总重量
  const totalQuantity = orders.reduce((sum, order) => sum + order.quantity, 0);
  const totalWeight = orders.reduce((sum, order) => sum + order.weight, 0);

  useEffect(() => {
    if (isOpen) {
      // 自动生成批次号
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      setBatch(`${dateStr}-A`);
      setTotalShippingAmount(0);
      setTotalShippingWeight(totalWeight);
    }
  }, [isOpen, totalWeight]);

  const handleConfirm = () => {
    if (!batch || totalShippingAmount <= 0) {
      alert("请填写批次号和邮费总金额");
      return;
    }
    onConfirm(batch, totalShippingAmount, totalShippingWeight);
    onClose();
  };

  // 计算每个订单的邮费预览
  const calculateShippingCostPreview = (order: PurchaseOrder) => {
    if (totalShippingWeight === 0) return 0;
    return (order.weight / totalShippingWeight) * totalShippingAmount / order.quantity;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>发货确认</DialogTitle>
          <DialogDescription>
            将未分配批次的订单设置为发货状态
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 订单汇总 */}
          <div className="p-4 bg-blue-50 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span>订单数量：</span>
              <span>{orders.length} 个订单</span>
            </div>
            <div className="flex justify-between">
              <span>总件数：</span>
              <span>{totalQuantity} 件</span>
            </div>
            <div className="flex justify-between">
              <span>总重量：</span>
              <span>{totalWeight.toFixed(2)} kg</span>
            </div>
          </div>

          {/* 发货信息 */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>发货批次 *</Label>
              <Input
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                placeholder="例如：2025-10-24-A"
              />
            </div>

            <div className="space-y-2">
              <Label>邮费总金额（元）*</Label>
              <Input
                type="number"
                step="0.01"
                value={totalShippingAmount || ""}
                onChange={(e) => setTotalShippingAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>总重量（kg）</Label>
              <Input
                type="number"
                step="0.1"
                value={totalShippingWeight || ""}
                onChange={(e) => setTotalShippingWeight(parseFloat(e.target.value) || 0)}
                placeholder="0.0"
              />
              <p className="text-xs text-gray-500">默认为订单总重量，可调整</p>
            </div>
          </div>

          {/* 邮费分摊预览 */}
          {totalShippingAmount > 0 && totalShippingWeight > 0 && (
            <div className="space-y-2">
              <Label>邮费分摊预览</Label>
              <div className="p-3 bg-gray-50 rounded-lg space-y-2 max-h-60 overflow-y-auto">
                {orders.map((order) => {
                  const unitShippingCost = calculateShippingCostPreview(order);
                  return (
                    <div key={order.id} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <span>{order.skuName}</span>
                        <span className="text-gray-500 ml-2">({order.domesticOrderNumber})</span>
                      </div>
                      <div className="flex items-center gap-4 text-gray-600">
                        <span>{order.weight}kg</span>
                        <span>{order.quantity}件</span>
                        <span className="text-blue-600">¥{unitShippingCost.toFixed(2)}/件</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500">
                计算公式：单个邮费 = (订单重量 / 总重量) × 邮费总金额 / 订单数量
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleConfirm}>
            确认发货
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
