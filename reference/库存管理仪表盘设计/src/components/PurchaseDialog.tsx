import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import type { PurchaseOrder, PurchaseStatus } from "../App";

interface PurchaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  skuId: string;
  skuName: string;
  onSave: (purchase: PurchaseOrder) => void;
}

export function PurchaseDialog({
  isOpen,
  onClose,
  skuId,
  skuName,
  onSave,
}: PurchaseDialogProps) {
  const [formData, setFormData] = useState({
    domesticOrderNumber: "",
    status: "国内在途" as PurchaseStatus,
    weight: 0,
    quantity: 0,
    amount: 0,
    batch: "",
    shippingDate: new Date().toISOString().split('T')[0],
    arrivalTime: "",
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        domesticOrderNumber: "",
        status: "国内在途",
        weight: 0,
        quantity: 0,
        amount: 0,
        batch: "",
        shippingDate: new Date().toISOString().split('T')[0],
        arrivalTime: "",
      });
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!formData.domesticOrderNumber || !formData.quantity) {
      alert("请填写必填项");
      return;
    }

    const newPurchase: PurchaseOrder = {
      id: Date.now().toString(),
      skuId,
      skuName,
      domesticOrderNumber: formData.domesticOrderNumber,
      status: formData.status,
      weight: formData.weight,
      quantity: formData.quantity,
      amount: formData.amount,
      batch: formData.batch,
      shippingDate: formData.shippingDate,
      arrivalTime: formData.arrivalTime || undefined,
    };

    onSave(newPurchase);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新增采购 - {skuName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>国内单号 *</Label>
            <Input
              value={formData.domesticOrderNumber}
              onChange={(e) =>
                setFormData({ ...formData, domesticOrderNumber: e.target.value })
              }
              placeholder="例如：DOM2025001"
            />
          </div>

          <div className="space-y-2">
            <Label>状态 *</Label>
            <Select
              value={formData.status}
              onValueChange={(value: PurchaseStatus) =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="国内在途">国内在途</SelectItem>
                <SelectItem value="日本在途">日本在途</SelectItem>
                <SelectItem value="日本到达">日本到达</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>重量（kg）</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.weight || ""}
                onChange={(e) =>
                  setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })
                }
                placeholder="0.0"
              />
            </div>

            <div className="space-y-2">
              <Label>数量 *</Label>
              <Input
                type="number"
                value={formData.quantity || ""}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })
                }
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>金额（元）</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.amount || ""}
              onChange={(e) =>
                setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
              }
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label>发货批次</Label>
            <Input
              value={formData.batch}
              onChange={(e) =>
                setFormData({ ...formData, batch: e.target.value })
              }
              placeholder="例如：2025-10-10-A"
            />
          </div>

          <div className="space-y-2">
            <Label>发出时间</Label>
            <Input
              type="date"
              value={formData.shippingDate}
              onChange={(e) =>
                setFormData({ ...formData, shippingDate: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>到货时间</Label>
            <Input
              type="date"
              value={formData.arrivalTime}
              onChange={(e) =>
                setFormData({ ...formData, arrivalTime: e.target.value })
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave}>
            确认
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
