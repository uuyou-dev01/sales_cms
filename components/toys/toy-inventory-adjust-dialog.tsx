"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Minus, Package } from "lucide-react";
import { ToyPurchaseOrder } from "@/lib/toy-types";

interface ToyInventoryAdjustDialogProps {
  isOpen: boolean;
  onClose: () => void;
  skuName: string;
  currentStock: number;
  inTransitOrders: ToyPurchaseOrder[];
  onSave: (newStock: number) => void;
  onViewInTransit: () => void;
}

export function ToyInventoryAdjustDialog({
  isOpen,
  onClose,
  skuName,
  currentStock,
  inTransitOrders,
  onSave,
  onViewInTransit,
}: ToyInventoryAdjustDialogProps) {
  const [adjustment, setAdjustment] = useState(0);
  const [inputValue, setInputValue] = useState("0");

  useEffect(() => {
    if (isOpen) {
      setAdjustment(0);
      setInputValue("0");
    }
  }, [isOpen]);

  const newStock = currentStock + adjustment;
  
  // 计算在途总数
  const inTransitTotal = inTransitOrders.reduce((sum, order) => sum + order.quantity, 0);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      setAdjustment(num);
    }
  };

  const handleIncrement = () => {
    const newAdjustment = adjustment + 1;
    setAdjustment(newAdjustment);
    setInputValue(newAdjustment.toString());
  };

  const handleDecrement = () => {
    const newAdjustment = adjustment - 1;
    setAdjustment(newAdjustment);
    setInputValue(newAdjustment.toString());
  };

  const handleSave = () => {
    if (newStock >= 0) {
      onSave(newStock);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>调整库存</DialogTitle>
          <DialogDescription>
            {skuName} - 当前库存：{currentStock}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 在途信息 */}
          {inTransitTotal > 0 && (
            <div 
              className="p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
              onClick={onViewInTransit}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-900">在途数量</span>
                </div>
                <span className="text-blue-900">{inTransitTotal}</span>
              </div>
              <div className="mt-2 space-y-1">
                {inTransitOrders.map((order) => (
                  <div key={order.id} className="text-xs text-blue-700 flex justify-between">
                    <span>{order.domesticOrderNumber} ({order.status})</span>
                    <span>{order.quantity} 件 - {new Date(order.shippingDate).toLocaleDateString('zh-CN')}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-blue-600 mt-2">点击查看详情</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>调整数量</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleDecrement}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Input
                type="number"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                className="text-center"
                placeholder="0"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleIncrement}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              正数表示入库，负数表示出库
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span>调整后库存：</span>
              <span className={newStock < 0 ? "text-red-500" : ""}>{newStock}</span>
            </div>
          </div>

          {newStock < 0 && (
            <p className="text-sm text-red-500">警告：库存不能为负数</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={newStock < 0}>
            确认
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
