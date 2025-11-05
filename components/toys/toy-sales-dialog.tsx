"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToyInventoryBatch } from "@/lib/toy-types";

interface ToySalesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  skuName: string;
  skuPrice: number;
  currentStock: number;
  batches: ToyInventoryBatch[];
  onSave: (quantity: number, amount: number, updatedBatches: ToyInventoryBatch[], cost: number, profit: number) => void;
}

export function ToySalesDialog({
  isOpen,
  onClose,
  skuName,
  skuPrice,
  currentStock,
  batches,
  onSave,
}: ToySalesDialogProps) {
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
    }
  }, [isOpen]);

  const amount = quantity * skuPrice;
  const canSell = quantity > 0 && quantity <= currentStock;

  // 先进先出逻辑
  const getFIFOBatches = (sellQuantity: number): ToyInventoryBatch[] => {
    const sortedBatches = [...batches].sort(
      (a, b) => new Date(a.inboundDate).getTime() - new Date(b.inboundDate).getTime()
    );

    let remaining = sellQuantity;
    const updatedBatches: ToyInventoryBatch[] = [];

    for (const batch of sortedBatches) {
      if (remaining <= 0) {
        updatedBatches.push(batch);
      } else if (batch.quantity > remaining) {
        updatedBatches.push({
          ...batch,
          quantity: batch.quantity - remaining,
        });
        remaining = 0;
      } else {
        remaining -= batch.quantity;
        // 不添加数量为0的批次
      }
    }

    return updatedBatches;
  };

  const getBatchesPreview = () => {
    const sortedBatches = [...batches].sort(
      (a, b) => new Date(a.inboundDate).getTime() - new Date(b.inboundDate).getTime()
    );

    let remaining = quantity;
    const preview: { date: string; quantity: number; unitCostPrice: number }[] = [];

    for (const batch of sortedBatches) {
      if (remaining <= 0) break;

      const deductQuantity = Math.min(batch.quantity, remaining);
      preview.push({
        date: batch.inboundDate,
        quantity: deductQuantity,
        unitCostPrice: batch.unitCostPrice,
      });
      remaining -= deductQuantity;
    }

    return preview;
  };

  // 计算成本和利润
  const calculateCostAndProfit = () => {
    const preview = getBatchesPreview();
    const totalCost = preview.reduce((sum, item) => sum + (item.quantity * Number(item.unitCostPrice)), 0);
    const profit = amount - totalCost;
    return { cost: totalCost, profit };
  };

  const { cost, profit } = calculateCostAndProfit();

  const handleSave = () => {
    if (canSell) {
      const updatedBatches = getFIFOBatches(quantity);
      onSave(quantity, amount, updatedBatches, cost, profit);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>销售 - {skuName}</DialogTitle>
          <DialogDescription>
            单价: ¥{skuPrice} | 当前库存: {currentStock}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>销售数量</Label>
            <Input
              type="number"
              min="1"
              max={currentStock}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="p-4 bg-blue-50 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span>销售金额：</span>
              <span className="text-blue-900">¥{amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>成本：</span>
              <span className="text-orange-700">¥{cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center border-t pt-2">
              <span>利润：</span>
              <span className={profit >= 0 ? "text-green-600" : "text-red-600"}>
                ¥{profit.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>剩余库存：</span>
              <span className={currentStock - quantity < 0 ? "text-red-500" : ""}>
                {currentStock - quantity}
              </span>
            </div>
          </div>

          {/* 先进先出预览 */}
          <div className="space-y-2">
            <Label>出库批次（先进先出）</Label>
            <div className="p-3 bg-gray-50 rounded-lg space-y-2 text-sm">
              {getBatchesPreview().map((item, index) => (
                <div key={index} className="flex justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">{new Date(item.date).toLocaleDateString('zh-CN')}</span>
                    <span className="text-xs text-gray-500">¥{Number(item.unitCostPrice).toFixed(2)}/件</span>
                  </div>
                  <span>{item.quantity} 件</span>
                </div>
              ))}
              {getBatchesPreview().length === 0 && (
                <span className="text-gray-500">无可用批次</span>
              )}
            </div>
          </div>

          {!canSell && quantity > currentStock && (
            <p className="text-sm text-red-500">库存不足</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={!canSell}>
            确认销售
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
