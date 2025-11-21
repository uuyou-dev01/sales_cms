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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

const CURRENCY_OPTIONS = ["CNY", "JPY", "USD"];

interface ImportConsolidationDialogProps {
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
}

type ParsedPackage = {
  trackingNo: string; // 快递单号
  weight: number; // 计费重量
  arrivedAt?: string; // 到库时间
};

export function ImportConsolidationDialog({
  open,
  onClose,
  onImported,
}: ImportConsolidationDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [parsing, setParsing] = React.useState(false);
  const [form, setForm] = React.useState({
    consolidationTrackingNo: "", // 发货单号（转运单号）
    totalCost: "",
    currency: "CNY",
    rawText: "",
  });
  const [parsedPackages, setParsedPackages] = React.useState<ParsedPackage[]>([]);
  const [unmatchedDialogOpen, setUnmatchedDialogOpen] = React.useState(false);
  const [unmatchedTrackingNos, setUnmatchedTrackingNos] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!open) {
      setForm({
        consolidationTrackingNo: "",
        totalCost: "",
        currency: "CNY",
        rawText: "",
      });
      setParsedPackages([]);
      setLoading(false);
      setParsing(false);
      setUnmatchedTrackingNos([]);
      setUnmatchedDialogOpen(false);
    }
  }, [open]);

  const parseText = () => {
    setParsing(true);
    try {
      const text = form.rawText;
      if (!text.trim()) {
        toast({ title: "请输入包裹数据", variant: "destructive" });
        setParsing(false);
        return;
      }

      // 提取发货单号（所有包裹共用的转运单号）
      const consolidationMatch = text.match(/发货单号\s+([A-Z0-9]+)/);
      const consolidationNo = consolidationMatch ? consolidationMatch[1] : form.consolidationTrackingNo || "";

      // 按空白行或分隔符分割包裹块
      const blocks = text.split(/\n\s*\n|(?=尺寸\s*\(cm\))/).filter((b) => b.trim());

      const packages: ParsedPackage[] = [];

      for (const block of blocks) {
        // 提取快递单号
        const trackingMatch = block.match(/快递单号\s+([A-Z0-9]+)/);
        const trackingNo = trackingMatch ? trackingMatch[1].trim() : "";

        // 提取计费重量
        const weightMatch = block.match(/计费重量\s+([\d.]+)\s*kg/);
        const weight = weightMatch ? parseFloat(weightMatch[1]) : 0;

        // 提取到库时间（可选）
        const timeMatch = block.match(/到库时间\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
        const arrivedAt = timeMatch ? timeMatch[1] : undefined;

        if (trackingNo && weight > 0) {
          packages.push({
            trackingNo,
            weight,
            arrivedAt,
          });
        }
      }

      if (packages.length === 0) {
        toast({ title: "未能解析出包裹数据", description: "请检查格式是否正确", variant: "destructive" });
        setParsing(false);
        return;
      }

      setParsedPackages(packages);
      if (consolidationNo) {
        setForm((prev) => ({ ...prev, consolidationTrackingNo: consolidationNo }));
      }

      toast({ title: `已解析 ${packages.length} 个包裹`, description: "请确认信息后提交" });
    } catch (error: any) {
      toast({ title: "解析失败", description: error?.message || "请检查数据格式", variant: "destructive" });
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.consolidationTrackingNo) {
      toast({ title: "请输入发货单号（转运单号）", variant: "destructive" });
      return;
    }
    if (!form.totalCost || Number(form.totalCost) <= 0) {
      toast({ title: "请输入有效总费用", variant: "destructive" });
      return;
    }
    if (parsedPackages.length === 0) {
      toast({ title: "请先解析包裹数据", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/logistics/import-consolidation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consolidationTrackingNo: form.consolidationTrackingNo,
          totalCost: Number(form.totalCost),
          currency: form.currency,
          packages: parsedPackages,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errorMsg = json?.error || json?.message || "导入失败";
        throw new Error(errorMsg);
      }

      // 检查是否有未匹配的单号
      const data = json?.data || json;
      const matched = data?.matched || 0;
      const notMatched = data?.notMatched || [];
      
      if (notMatched.length > 0) {
        setUnmatchedTrackingNos(notMatched);
        setUnmatchedDialogOpen(true);
        toast({ 
          title: "导入完成（部分单号未匹配）", 
          description: `已匹配 ${matched} 个包裹，${notMatched.length} 个单号未找到`,
          variant: "destructive",
        });
      } else {
        toast({ 
          title: "导入成功", 
          description: `已成功处理 ${matched} 个包裹，费用已按重量分摊到采购成本。` 
        });
        onClose();
        onImported?.();
      }
    } catch (error: any) {
      toast({ 
        title: "导入失败", 
        description: error?.message || "请稍后再试", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const totalWeight = parsedPackages.reduce((sum, pkg) => sum + pkg.weight, 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>导入转运仓包裹数据</DialogTitle>
          <p className="text-sm text-muted-foreground">
            粘贴转运仓提供的包裹列表，系统将自动匹配快递单号并创建转运订单。
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>包裹数据（粘贴转运仓数据）</Label>
            <Textarea
              rows={8}
              placeholder="粘贴包含发货单号、快递单号、计费重量等信息的文本..."
              value={form.rawText}
              onChange={(e) => setForm({ ...form, rawText: e.target.value })}
              className="font-mono text-xs"
            />
            <div className="mt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={parseText} disabled={parsing || !form.rawText.trim()}>
                {parsing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    解析中...
                  </>
                ) : (
                  "解析数据"
                )}
              </Button>
            </div>
          </div>

          {parsedPackages.length > 0 && (
            <div className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>发货单号（转运单号）</Label>
                  <Input
                    value={form.consolidationTrackingNo}
                    onChange={(e) => setForm({ ...form, consolidationTrackingNo: e.target.value })}
                    placeholder="EB847270271CN"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>总费用</Label>
                    <Input
                      type="number"
                      value={form.totalCost}
                      onChange={(e) => setForm({ ...form, totalCost: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>币种</Label>
                    <Select
                      value={form.currency}
                      onValueChange={(val) => setForm({ ...form, currency: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map((cur) => (
                          <SelectItem key={cur} value={cur}>
                            {cur}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  已解析 <strong>{parsedPackages.length}</strong> 个包裹，总重量 <strong>{totalWeight.toFixed(2)} kg</strong>
                  <br />
                  系统将根据快递单号匹配现有物流记录，并自动更新状态、重量，按重量分摊费用。
                </AlertDescription>
              </Alert>

              <div className="border rounded-md max-h-60 overflow-y-auto">
                <div className="bg-muted px-3 py-2 text-xs font-medium grid grid-cols-3 gap-2 sticky top-0">
                  <div>快递单号</div>
                  <div className="text-right">重量 (kg)</div>
                  <div>到库时间</div>
                </div>
                <div className="divide-y">
                  {parsedPackages.map((pkg, idx) => (
                    <div key={idx} className="px-3 py-2 text-sm grid grid-cols-3 gap-2">
                      <div className="font-mono text-xs">{pkg.trackingNo}</div>
                      <div className="text-right">{pkg.weight.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">{pkg.arrivedAt || "-"}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={loading || parsedPackages.length === 0}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                处理中...
              </>
            ) : (
              "确认导入"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* 未匹配单号提示对话框 */}
      <Dialog open={unmatchedDialogOpen} onOpenChange={setUnmatchedDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>部分单号未匹配</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertDescription>
                以下 {unmatchedTrackingNos.length} 个单号在系统中未找到匹配的物流记录或采购单：
              </AlertDescription>
            </Alert>
            <div className="max-h-64 overflow-y-auto rounded-md border bg-muted/50 p-3">
              <div className="space-y-1">
                {unmatchedTrackingNos.map((trackingNo, idx) => (
                  <div key={idx} className="text-sm font-mono py-1 px-2 bg-background rounded">
                    {trackingNo}
                  </div>
                ))}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              请检查单号是否正确，或先在系统中创建对应的物流记录或采购单。
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setUnmatchedDialogOpen(false);
                onClose();
                onImported?.();
              }}
            >
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

