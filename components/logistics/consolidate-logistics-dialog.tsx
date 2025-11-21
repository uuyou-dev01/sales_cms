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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { LogisticsRecord } from "@/components/logistics-tracker";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface ConsolidateLogisticsDialogProps {
  open: boolean;
  selectedRecords: LogisticsRecord[];
  onClose: () => void;
  onConsolidated?: () => void;
}

export function ConsolidateLogisticsDialog({
  open,
  selectedRecords,
  onClose,
  onConsolidated,
}: ConsolidateLogisticsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({
    trackingNo: "",
    status: "AT_WAREHOUSE",
    route: "CHINA_TO_JAPAN",
    cost: "",
    currency: "CNY",
  });
  const [weights, setWeights] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setForm({
        trackingNo: "",
        status: "AT_WAREHOUSE",
        route: "CHINA_TO_JAPAN",
        cost: "",
        currency: "CNY",
      });
      // Initialize weights from existing records if available (assuming stored in segments or root)
      const initialWeights: Record<string, string> = {};
      selectedRecords.forEach(r => {
          // This is a simplification; actual weight might be deep in segments
          initialWeights[r.id] = ""; 
      });
      setWeights(initialWeights);
    }
  }, [open, selectedRecords]);

  const totalWeight = React.useMemo(() => {
    return Object.values(weights).reduce((sum, w) => sum + (Number(w) || 0), 0);
  }, [weights]);

  const handleSubmit = async () => {
    if (!form.cost || Number(form.cost) <= 0) {
      toast({ title: "请输入有效费用", variant: "destructive" });
      return;
    }
    if (totalWeight <= 0) {
      toast({ title: "请至少输入一个包裹的重量", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      
      const res = await fetch("/api/logistics/consolidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNo: form.trackingNo,
          status: form.status,
          cost: Number(form.cost),
          currency: form.currency,
          route: form.route,
          packages: selectedRecords.map(r => ({
              logisticsId: r.id,
              weight: Number(weights[r.id]) || 0
          }))
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "合并失败");

      toast({ title: "包裹已合并", description: "费用已按重量分摊并计入采购成本" });
      onClose();
      onConsolidated?.();
    } catch (error: any) {
      toast({ title: "合并失败", description: error?.message || "请稍后再试", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>转运仓合并包裹</DialogTitle>
          <p className="text-sm text-muted-foreground">
            将选中的 {selectedRecords.length} 个物流记录合并为一个集运包裹。请录入每个包裹的入库重量。
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
             <div>
                <Label>新运单号</Label>
                <Input
                  placeholder="集运单号"
                  value={form.trackingNo}
                  onChange={(e) => setForm({ ...form, trackingNo: e.target.value })}
                />
             </div>
             <div>
                <Label>线路</Label>
                <Select
                    value={form.route}
                    onValueChange={(val) => setForm({ ...form, route: val })}
                >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="CHINA_TO_JAPAN">中国 → 日本 (转运仓)</SelectItem>
                        <SelectItem value="JAPAN_LOCAL">日本本土</SelectItem>
                        <SelectItem value="CUSTOM">自定义</SelectItem>
                    </SelectContent>
                </Select>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>总费用</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="金额"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  className="flex-1"
                />
                <Select
                  value={form.currency}
                  onValueChange={(val) => setForm({ ...form, currency: val })}
                >
                  <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((cur) => (
                      <SelectItem key={cur} value={cur}>{cur}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
                <Label>总重量 (自动计算)</Label>
                <div className="h-10 flex items-center px-3 border rounded-md bg-muted text-sm">
                    {totalWeight.toFixed(2)} kg
                </div>
            </div>
          </div>

          <div className="border rounded-md">
              <div className="bg-muted px-3 py-2 text-xs font-medium flex justify-between">
                  <span>包裹清单</span>
                  <span>重量 (kg)</span>
              </div>
              <ScrollArea className="h-[200px]">
                  <div className="divide-y">
                      {selectedRecords.map(record => (
                          <div key={record.id} className="px-3 py-2 flex items-center justify-between text-sm">
                              <div className="flex-1 pr-4">
                                  <div className="font-medium truncate">{record.trackingNo || "无运单号"}</div>
                                  <div className="text-xs text-muted-foreground">
                                      {record.relatedType} · {record.relatedId}
                                  </div>
                              </div>
                              <Input
                                  type="number"
                                  className="w-20 h-8 text-right"
                                  placeholder="0.00"
                                  value={weights[record.id] || ""}
                                  onChange={(e) => setWeights(prev => ({ ...prev, [record.id]: e.target.value }))}
                              />
                          </div>
                      ))}
                  </div>
              </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "处理中..." : "确认合并"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
