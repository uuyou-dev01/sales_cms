"use client";

import React from "react";
import useSWR from "swr";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import { useSWRConfig } from "swr";
import type { LogisticsRecord } from "@/components/logistics-tracker";

type LogisticsLinkedItem = {
  itemId: string;
  itemName: string;
  skuId?: string;
  skuName?: string;
  itemSize?: string;
  itemCondition?: string;
  status?: string;
  batchNumber?: string | null;
};

type LogisticsAllocation = {
  purchaseOrderId?: string;
  relatedId?: string;
  itemId?: string;
  weight?: number;
  amount?: number;
  currency?: string;
  note?: string;
};

type LogisticsDetail = LogisticsRecord & {
  linkedItems?: LogisticsLinkedItem[];
  allocations?: LogisticsAllocation[];
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const STATUS_OPTIONS = [
  { value: "PENDING", label: "待创建" },
  { value: "IN_TRANSIT", label: "国内在途" },
  { value: "AT_FORWARDER", label: "转运仓待发" },
  { value: "LEAVING_CHINA", label: "已出境" },
  { value: "AT_WAREHOUSE", label: "日本仓签收" },
  { value: "DELIVERED", label: "已交付" },
  { value: "EXCEPTION", label: "异常" },
];

const DESTINATION_OPTIONS = [
  { value: "WAREHOUSE", label: "仓库" },
  { value: "FORWARDER", label: "转运仓" },
  { value: "CUSTOMER", label: "客户" },
];

const CURRENCY_OPTIONS = ["CNY", "JPY", "USD"];

const ROUTE_OPTIONS = [
  { value: "CHINA_TO_JAPAN", label: "中国 → 日本 (转运仓)" },
  { value: "JAPAN_LOCAL", label: "日本本土" },
  { value: "CUSTOM", label: "自定义" },
];

interface LogisticsDetailDrawerProps {
  recordId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function LogisticsDetailDrawer({
  recordId,
  open,
  onOpenChange,
  onUpdated,
}: LogisticsDetailDrawerProps) {
  const { toast } = useToast();
  const { mutate: mutateGlobal } = useSWRConfig();
  const { data, error, isLoading, mutate } = useSWR(
    open && recordId ? `/api/logistics/${recordId}` : null,
    fetcher
  );

  const detail: LogisticsDetail | undefined = data?.data;
  const linkedItems = detail?.linkedItems ?? [];
  const existingAllocations = detail?.allocations ?? [];

  const [tab, setTab] = React.useState("info");
  const [infoState, setInfoState] = React.useState({
    trackingNo: "",
    status: "",
    destination: "WAREHOUSE",
    fromCountry: "",
    fromNode: "",
    toCountry: "",
    toNode: "",
    cost: "",
    currency: "CNY",
    departedAt: "",
    arrivedAt: "",
    route: "",
  });

  React.useEffect(() => {
    if (!detail) return;
    setInfoState({
      trackingNo: detail.trackingNo || "",
      status: detail.status || "PENDING",
      destination: detail.destination || "WAREHOUSE",
      fromCountry: detail.fromCountry || "",
      fromNode: detail.fromNode || "",
      toCountry: detail.toCountry || "",
      toNode: detail.toNode || "",
      cost: detail.cost ? String(detail.cost) : "",
      currency: detail.currency || "CNY",
      departedAt: detail.departedAt ? formatInputDate(detail.departedAt) : "",
      arrivedAt: detail.arrivedAt ? formatInputDate(detail.arrivedAt) : "",
      route: detail.segments?.route || "CUSTOM",
    });
  }, [detail]);

  const handleInfoChange = (field: keyof typeof infoState, value: string) => {
    setInfoState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveInfo = async () => {
    if (!recordId) return;
    try {
      const payload: Record<string, unknown> = {
        trackingNo: infoState.trackingNo || null,
        status: infoState.status,
        destination: infoState.destination,
        fromCountry: infoState.fromCountry || null,
        fromNode: infoState.fromNode || null,
        toCountry: infoState.toCountry || null,
        toNode: infoState.toNode || null,
        cost: infoState.cost ? Number(infoState.cost) : null,
        currency: infoState.currency || null,
        departedAt: infoState.departedAt ? new Date(infoState.departedAt).toISOString() : null,
        arrivedAt: infoState.arrivedAt ? new Date(infoState.arrivedAt).toISOString() : null,
        segments: { ...detail?.segments, route: infoState.route },
      };

      const res = await fetch(`/api/logistics/${recordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "保存失败");
      toast({ title: "基本信息已保存" });
      await mutate();
      await mutateGlobal("/api/logistics");
      onUpdated?.();
    } catch (err: any) {
      toast({ title: "保存失败", description: err?.message || "请稍后再试", variant: "destructive" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>物流详情</SheetTitle>
          {detail && (
            <p className="text-sm text-muted-foreground">
              关联 {detail.relatedType} · {detail.relatedId}
            </p>
          )}
        </SheetHeader>

        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertTitle>加载失败</AlertTitle>
            <AlertDescription>请稍后再试。</AlertDescription>
          </Alert>
        )}

        {!detail && !isLoading && (
          <div className="mt-6 text-sm text-muted-foreground">暂无数据</div>
        )}

        {detail && (
          <div className="mt-6 space-y-6">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="info">基本信息</TabsTrigger>
                <TabsTrigger value="cost">费用分摊</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <Card className="p-4 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>运单号</Label>
                      <Input
                        value={infoState.trackingNo}
                        onChange={(e) => handleInfoChange("trackingNo", e.target.value)}
                        placeholder="输入运单号"
                      />
                    </div>
                    <div>
                      <Label>状态</Label>
                      <Select
                        value={infoState.status}
                        onValueChange={(val) => handleInfoChange("status", val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择状态" />
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
                      <Label>目的地</Label>
                      <Select
                        value={infoState.destination}
                        onValueChange={(val) => handleInfoChange("destination", val)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DESTINATION_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>费用</Label>
                        <Input
                          type="number"
                          value={infoState.cost}
                          onChange={(e) => handleInfoChange("cost", e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label>币种</Label>
                        <Select
                          value={infoState.currency}
                          onValueChange={(val) => handleInfoChange("currency", val)}
                        >
                          <SelectTrigger>
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

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="col-span-2">
                        <Label>线路预设</Label>
                        <Select value={infoState.route} onValueChange={(val) => handleInfoChange("route", val)}>
                            <SelectTrigger>
                                <SelectValue placeholder="选择线路" />
                            </SelectTrigger>
                            <SelectContent>
                                {ROUTE_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                      <Label>出发地</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="国家/地区"
                          value={infoState.fromCountry}
                          onChange={(e) => handleInfoChange("fromCountry", e.target.value)}
                        />
                        <Input
                          placeholder="节点/仓库"
                          value={infoState.fromNode}
                          onChange={(e) => handleInfoChange("fromNode", e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>目的地</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="国家/地区"
                          value={infoState.toCountry}
                          onChange={(e) => handleInfoChange("toCountry", e.target.value)}
                        />
                        <Input
                          placeholder="节点/仓库"
                          value={infoState.toNode}
                          onChange={(e) => handleInfoChange("toNode", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>发货时间</Label>
                      <Input
                        type="datetime-local"
                        value={infoState.departedAt}
                        onChange={(e) => handleInfoChange("departedAt", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>到达时间</Label>
                      <Input
                        type="datetime-local"
                        value={infoState.arrivedAt}
                        onChange={(e) => handleInfoChange("arrivedAt", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveInfo}>保存基本信息</Button>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="cost">
                <div className="mb-4 p-4 bg-amber-50 text-amber-800 rounded-md text-sm">
                    提示：费用分摊建议在“合并转运”时统一处理。此处修改将直接覆盖 Item 的物流成本，请谨慎操作。
                </div>
                <CostAllocationPanel
                  detail={detail}
                  linkedItems={linkedItems}
                  existingAllocations={existingAllocations}
                  onSaved={async () => {
                    await mutate();
                    await mutateGlobal("/api/logistics");
                    onUpdated?.();
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {isLoading && (
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            加载中…
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function formatInputDate(value: string) {
  const date = new Date(value);
  const iso = date.toISOString();
  return iso.slice(0, 16);
}

type CostAllocationProps = {
  detail: LogisticsDetail;
  linkedItems: LogisticsLinkedItem[];
  existingAllocations: LogisticsAllocation[];
  onSaved: () => Promise<void>;
};

function CostAllocationPanel({
  detail,
  linkedItems,
  existingAllocations,
  onSaved,
}: CostAllocationProps) {
  const { toast } = useToast();
  const [allocationMethod, setAllocationMethod] = React.useState<"WEIGHT" | "QUANTITY" | "MANUAL">("WEIGHT");
  const [weights, setWeights] = React.useState<Record<string, number>>({});
  const [draftAllocations, setDraftAllocations] = React.useState<LogisticsAllocation[]>([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    const nextWeights: Record<string, number> = {};
    const nextAllocations: LogisticsAllocation[] = [];
    linkedItems.forEach((item) => {
      const found = existingAllocations.find((alloc) => alloc.itemId === item.itemId);
      if (found?.weight) {
        nextWeights[item.itemId] = Number(found.weight);
      }
      if (found) {
        nextAllocations.push(found);
      }
    });
    setWeights(nextWeights);
    setDraftAllocations(nextAllocations.length > 0 ? nextAllocations : []);
  }, [linkedItems, existingAllocations]);

  const baseCost = React.useMemo(() => {
    const numericCost = Number(detail.cost ?? 0);
    if (!isNaN(numericCost) && numericCost > 0) return numericCost;
    return existingAllocations.reduce((sum, alloc) => sum + (Number(alloc.amount) || 0), 0);
  }, [detail.cost, existingAllocations]);

  const totalWeight = React.useMemo(() => {
    return Object.values(weights).reduce((sum, w) => sum + (Number(w) || 0), 0);
  }, [weights]);

  const currency = detail.currency || "CNY";

  const handleWeightChange = (itemId: string, value: number) => {
    setWeights((prev) => ({ ...prev, [itemId]: value }));
  };

  const handleManualAmountChange = (itemId: string, value: number) => {
    setDraftAllocations((prev) => {
      const existing = prev.find((alloc) => alloc.itemId === itemId);
      if (existing) {
        return prev.map((alloc) =>
          alloc.itemId === itemId ? { ...alloc, amount: value, note: "MANUAL" } : alloc
        );
      }
      return [
        ...prev,
        {
          itemId,
          purchaseOrderId: detail.relatedType === "PURCHASE_ORDER" ? detail.relatedId : undefined,
          weight: weights[itemId] || 0,
          amount: value,
          currency,
          note: "MANUAL",
        },
      ];
    });
  };

  const handleAllocate = () => {
    if (!baseCost || baseCost <= 0) {
      toast({ title: "缺少费用信息", description: "请先填写物流费用再进行分摊。", variant: "destructive" });
      return;
    }

    let allocations: LogisticsAllocation[] = [];

    if (allocationMethod === "WEIGHT") {
      if (!totalWeight || totalWeight <= 0) {
        toast({ title: "缺少重量信息", description: "请先填写重量。", variant: "destructive" });
        return;
      }
      allocations = linkedItems.map((item) => {
        const weight = Number(weights[item.itemId]) || 0;
        const ratio = weight > 0 ? weight / totalWeight : 0;
        const amount = ratio > 0 ? Number((baseCost * ratio).toFixed(2)) : 0;
        return {
          itemId: item.itemId,
          purchaseOrderId: detail.relatedType === "PURCHASE_ORDER" ? detail.relatedId : undefined,
          weight,
          amount,
          currency,
          note: "AUTO_WEIGHT",
        };
      });
    } else if (allocationMethod === "QUANTITY") {
      const count = linkedItems.length || 1;
      const amount = Number((baseCost / count).toFixed(2));
      allocations = linkedItems.map((item) => ({
        itemId: item.itemId,
        purchaseOrderId: detail.relatedType === "PURCHASE_ORDER" ? detail.relatedId : undefined,
        weight: weights[item.itemId] || 0,
        amount,
        currency,
        note: "AUTO_QUANTITY",
      }));
    } else {
      allocations = linkedItems.map((item) => {
        const existing = draftAllocations.find((alloc) => alloc.itemId === item.itemId);
        return {
          itemId: item.itemId,
          purchaseOrderId: detail.relatedType === "PURCHASE_ORDER" ? detail.relatedId : undefined,
          weight: weights[item.itemId] || 0,
          amount: existing?.amount || 0,
          currency,
          note: "MANUAL",
        };
      });
    }

    setDraftAllocations(allocations);
    toast({ title: "分摊已计算", description: "请保存以写入成本。" });
  };

  const handleSave = async () => {
    if (!detail?.id) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/logistics/${detail.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allocations: draftAllocations }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "保存失败");
      toast({ title: "费用分摊已保存" });
      await onSaved();
    } catch (err: any) {
      toast({ title: "保存失败", description: err?.message || "请稍后再试", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">费用分摊</h4>
          <p className="text-xs text-muted-foreground">选择分摊方式并同步到 Item 成本。</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={allocationMethod} onValueChange={(val) => setAllocationMethod(val as any)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WEIGHT">按重量分摊</SelectItem>
              <SelectItem value="QUANTITY">按件数分摊</SelectItem>
              <SelectItem value="MANUAL">手动输入</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleAllocate}>
            计算分摊
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || draftAllocations.length === 0}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            保存分摊
          </Button>
        </div>
      </div>

      {linkedItems.length === 0 ? (
        <div className="text-sm text-muted-foreground">暂无关联物品，可在采购详情中补录。</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">物品</th>
                <th className="px-3 py-2 text-left font-medium">SKU</th>
                <th className="px-3 py-2 text-left font-medium">规格</th>
                <th className="px-3 py-2 text-left font-medium">重量 (kg)</th>
                <th className="px-3 py-2 text-right font-medium">金额 ({currency})</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {linkedItems.map((item) => {
                const allocation = draftAllocations.find((alloc) => alloc.itemId === item.itemId);
                return (
                  <tr key={item.itemId}>
                    <td className="px-3 py-2">
                      <div className="font-medium">{item.itemName}</div>
                      <div className="text-xs text-muted-foreground">{item.itemId}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div>{item.skuName || "-"}</div>
                      <div className="text-xs text-muted-foreground">{item.skuId || "-"}</div>
                    </td>
                    <td className="px-3 py-2">
                      {[item.itemSize, item.itemCondition].filter(Boolean).join(" / ") || "-"}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={weights[item.itemId] ?? ""}
                        onChange={(e) => handleWeightChange(item.itemId, Number(e.target.value) || 0)}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      {allocationMethod === "MANUAL" ? (
                        <Input
                          type="number"
                          className="h-8 w-24 ml-auto text-right"
                          value={allocation?.amount ?? ""}
                          onChange={(e) => handleManualAmountChange(item.itemId, Number(e.target.value))}
                        />
                      ) : allocation?.amount ? (
                        Number(allocation.amount).toFixed(2)
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-gray-600">
            <div>总重量：{totalWeight.toFixed(2)} kg</div>
            <div>可分摊费用：{baseCost ? `${baseCost.toFixed(2)} ${currency}` : "未设置"}</div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default LogisticsDetailDrawer;
