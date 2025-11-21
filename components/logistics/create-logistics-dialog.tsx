"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const STATUS_OPTIONS = [
  { value: "PENDING", label: "待创建" },
  { value: "IN_TRANSIT", label: "国内在途" },
  { value: "AT_FORWARDER", label: "转运仓待发" },
  { value: "LEAVING_CHINA", label: "已出境" },
  { value: "AT_WAREHOUSE", label: "日本仓签收" },
  { value: "DELIVERED", label: "已交付" },
  { value: "EXCEPTION", label: "异常" },
];

const CURRENCY_OPTIONS = ["CNY", "JPY", "USD"];

interface CreateLogisticsDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (logisticsId: string) => void;
}

export function CreateLogisticsDialog({ open, onClose, onCreated }: CreateLogisticsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({
    orderIds: "",
    trackingNo: "",
    status: "IN_TRANSIT",
    fromCountry: "",
    fromNode: "",
    toCountry: "",
    toNode: "",
    cost: "",
    currency: "CNY",
  });

  React.useEffect(() => {
    if (!open) {
      setForm({
        orderIds: "",
        trackingNo: "",
        status: "IN_TRANSIT",
        fromCountry: "",
        fromNode: "",
        toCountry: "",
        toNode: "",
        cost: "",
        currency: "CNY",
      });
      setLoading(false);
    }
  }, [open]);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    const ids = form.orderIds
      .split(/\r?\n|,|;|\s/)
      .map((id) => id.trim())
      .filter(Boolean);
    if (ids.length === 0) {
      toast({ title: "请输入采购单号", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/logistics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          relatedType: "PURCHASE_ORDER",
          relatedId: ids[0],
          trackingNo: form.trackingNo || undefined,
          status: form.status,
          fromCountry: form.fromCountry || undefined,
          fromNode: form.fromNode || undefined,
          toCountry: form.toCountry || undefined,
          toNode: form.toNode || undefined,
          cost: form.cost ? Number(form.cost) : undefined,
          currency: form.currency || undefined,
          allocations: ids.map((id) => ({
            purchaseOrderId: id,
          })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "创建失败");
      toast({ title: "物流记录已创建", description: "可在列表中查看详情" });
      onClose();
      onCreated?.(json?.data?.id || json?.id);
    } catch (error: any) {
      toast({ title: "创建失败", description: error?.message || "请稍后再试", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>新建物流 / 集运包裹</DialogTitle>
          <p className="text-sm text-muted-foreground">
            输入一个或多个采购单号，将其合并为新的物流记录。
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>采购单号（可多条）</Label>
            <Textarea
              rows={3}
              placeholder="每行一个或使用逗号分隔"
              value={form.orderIds}
              onChange={(e) => handleChange("orderIds", e.target.value)}
            />
          </div>

          <div>
            <Label>运单号</Label>
            <Input
              placeholder="可选"
              value={form.trackingNo}
              onChange={(e) => handleChange("trackingNo", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>状态</Label>
              <Select value={form.status} onValueChange={(val) => handleChange("status", val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>费用</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="金额"
                  value={form.cost}
                  onChange={(e) => handleChange("cost", e.target.value)}
                  className="flex-1"
                />
                <Select
                  value={form.currency}
                  onValueChange={(val) => handleChange("currency", val)}
                >
                  <SelectTrigger className="w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((cur) => (
                      <SelectItem key={cur} value={cur}>{cur}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>出发地</Label>
              <Input
                placeholder="国家 / 仓库"
                value={form.fromCountry}
                onChange={(e) => handleChange("fromCountry", e.target.value)}
              />
              <Input
                className="mt-2"
                placeholder="节点 / 备注"
                value={form.fromNode}
                onChange={(e) => handleChange("fromNode", e.target.value)}
              />
            </div>
            <div>
              <Label>目的地</Label>
              <Input
                placeholder="国家 / 仓库"
                value={form.toCountry}
                onChange={(e) => handleChange("toCountry", e.target.value)}
              />
              <Input
                className="mt-2"
                placeholder="节点 / 备注"
                value={form.toNode}
                onChange={(e) => handleChange("toNode", e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "创建中..." : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateLogisticsDialog;
