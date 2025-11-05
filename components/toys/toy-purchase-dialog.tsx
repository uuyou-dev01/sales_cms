"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToyPurchaseOrder, ToyPurchaseStatus, PURCHASE_STATUS_LABELS } from "@/lib/toy-types";
import { useToast } from "@/hooks/use-toast";

interface ToyPurchaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  skuId: string;
  skuName: string;
  onSave: (purchase: ToyPurchaseOrder) => void;
}

export function ToyPurchaseDialog({
  isOpen,
  onClose,
  skuId,
  skuName,
  onSave,
}: ToyPurchaseDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    domesticOrderNumber: "",
    status: "DOMESTIC_IN_TRANSIT" as ToyPurchaseStatus,
    weight: 0,
    quantity: 0,
    amount: 0,
    batch: "",
    shippingDate: new Date().toISOString().split('T')[0],
    arrivalTime: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        domesticOrderNumber: "",
        status: "DOMESTIC_IN_TRANSIT",
        weight: 0,
        quantity: 0,
        amount: 0,
        batch: "",
        shippingDate: new Date().toISOString().split('T')[0],
        arrivalTime: "",
      });
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!formData.domesticOrderNumber || !formData.quantity) {
      toast({
        title: "验证失败",
        description: "请填写必填项",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/toys/purchase-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          skuId,
          domesticOrderNumber: formData.domesticOrderNumber,
          status: formData.status,
          weight: formData.weight,
          quantity: formData.quantity,
          amount: formData.amount,
          batch: formData.batch,
          shippingDate: formData.shippingDate,
          arrivalTime: formData.arrivalTime || undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "创建成功",
          description: `采购订单"${formData.domesticOrderNumber}"已创建`,
        });
        
        // 创建ToyPurchaseOrder对象
        const newPurchase: ToyPurchaseOrder = {
          id: data.data.id,
          skuId,
          domesticOrderNumber: formData.domesticOrderNumber,
          status: formData.status,
          weight: formData.weight,
          quantity: formData.quantity,
          amount: formData.amount,
          batch: formData.batch,
          shippingDate: formData.shippingDate,
          arrivalTime: formData.arrivalTime || undefined,
          shippingCost: undefined,
          totalShippingAmount: undefined,
          totalShippingWeight: undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        onSave(newPurchase);
        onClose();
      } else {
        throw new Error(data.message || "创建失败");
      }
    } catch (error) {
      console.error("创建采购订单失败:", error);
      toast({
        title: "创建失败",
        description: error instanceof Error ? error.message : "请重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
              onValueChange={(value: ToyPurchaseStatus) =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DOMESTIC_IN_TRANSIT">{PURCHASE_STATUS_LABELS.DOMESTIC_IN_TRANSIT}</SelectItem>
                <SelectItem value="JAPAN_IN_TRANSIT">{PURCHASE_STATUS_LABELS.JAPAN_IN_TRANSIT}</SelectItem>
                <SelectItem value="JAPAN_ARRIVED">{PURCHASE_STATUS_LABELS.JAPAN_ARRIVED}</SelectItem>
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
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "创建中..." : "确认"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
