"use client";

import React from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type LogisticsRecord = {
  id: string;
  relatedType: string;
  relatedId: string;
  trackingNo?: string | null;
  status?: string | null;
  destination?: string | null;
  cost?: string | number | null;
  currency?: string | null;
  departedAt?: string | null;
  arrivedAt?: string | null;
  fromCountry?: string | null;
  toCountry?: string | null;
  fromNode?: string | null;
  toNode?: string | null;
  createdAt?: string;
  segments?: any;
  allocations?: any;
};

export type LogisticsTrackerProps = {
  relatedType?: "ITEM" | "PURCHASE_ORDER" | "INVENTORY_BATCH";
  relatedId?: string;
  records?: LogisticsRecord[];
  className?: string;
  emptyMessage?: string;
  onSelectRecord?: (record: LogisticsRecord) => void;
  selectedId?: string | null;
  selectionMode?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const STATUS_META: Record<string, { label: string; tone: string }> = {
  PENDING: { label: "待创建", tone: "bg-gray-100 text-gray-700 border-gray-200" },
  IN_TRANSIT: { label: "国内在途", tone: "bg-sky-100 text-sky-800 border-sky-200" },
  AT_FORWARDER: { label: "转运仓待发", tone: "bg-amber-100 text-amber-800 border-amber-200" },
  LEAVING_CHINA: { label: "已出境", tone: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  AT_WAREHOUSE: { label: "日本仓签收", tone: "bg-blue-100 text-blue-800 border-blue-200" },
  DELIVERED: { label: "已交付", tone: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  EXCEPTION: { label: "异常", tone: "bg-red-100 text-red-800 border-red-200" },
};

function formatDate(value?: string | null, placeholder = "-") {
  if (!value) return placeholder;
  try {
    return format(new Date(value), "yyyy-MM-dd HH:mm");
  } catch {
    return value;
  }
}

function getStatusMeta(status?: string | null) {
  if (!status) return STATUS_META.PENDING;
  return STATUS_META[status] || STATUS_META.PENDING;
}

export function LogisticsTracker({
  relatedType,
  relatedId,
  records,
  className,
  emptyMessage,
  onSelectRecord,
  selectedId,
  selectionMode,
  selectedIds = [],
  onSelectionChange,
}: LogisticsTrackerProps) {
  const shouldFetch = !records && relatedType && relatedId;
  const { data, error, isLoading } = useSWR(
    shouldFetch ? `/api/logistics?type=${relatedType}&id=${relatedId}` : null,
    fetcher
  );

  if (shouldFetch && isLoading) {
    return (
      <Card className={cn("p-4 space-y-3", className)}>
        <div className="animate-pulse space-y-2">
          <div className="h-5 w-32 rounded bg-gray-200" />
          <div className="h-3 w-full rounded bg-gray-100" />
          <div className="h-3 w-11/12 rounded bg-gray-100" />
          <div className="h-3 w-10/12 rounded bg-gray-100" />
        </div>
      </Card>
    );
  }

  if (shouldFetch && error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTitle>物流数据加载失败</AlertTitle>
        <AlertDescription>请刷新页面或稍后重试。</AlertDescription>
      </Alert>
    );
  }

  const dataset: LogisticsRecord[] = records ?? ((data?.data || []) as LogisticsRecord[]);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const toggleSelection = (id: string, checked: boolean) => {
    if (!onSelectionChange) return;
    const next = checked
      ? [...selectedIds, id]
      : selectedIds.filter((i) => i !== id);
    onSelectionChange(next);
  };

  const toggleAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    onSelectionChange(checked ? dataset.map((r) => r.id) : []);
  };

  if (!mounted) {
    return null;
  }

  if (!dataset || dataset.length === 0) {
    return (
      <Card className={cn("p-6 text-center text-sm text-gray-500", className)}>
        <p>{emptyMessage || "暂无物流记录"}</p>
        <p className="mt-1">若该采购单尚未录入运单，可在物流页面补充物流信息。</p>
      </Card>
    );
  }

  if (selectionMode) {
    return (
      <div className={cn("rounded-md border bg-white", className)}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={dataset.length > 0 && selectedIds.length === dataset.length}
                  onCheckedChange={(checked) => toggleAll(!!checked)}
                />
              </TableHead>
              <TableHead>运单号 / 关联</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>路线</TableHead>
              <TableHead>费用</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dataset.map((record) => {
              const statusMeta = getStatusMeta(record.status);
              const isSelected = selectedIds.includes(record.id);
              return (
                <TableRow key={record.id} className={isSelected ? "bg-muted/50" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => toggleSelection(record.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{record.trackingNo || "未录入"}</div>
                    <div className="text-xs text-muted-foreground">
                      {record.relatedType} · {record.relatedId}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("border text-xs font-medium", statusMeta.tone)}>
                      {statusMeta.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {record.fromNode || record.fromCountry || "未知"} →{" "}
                      {record.toNode || record.toCountry || "未知"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(record.departedAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {record.cost ? `${record.cost} ${record.currency || ""}` : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectRecord?.(record)}
                    >
                      详情
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {dataset.map((record) => {
        const statusMeta = getStatusMeta(record.status);
        const isActive = selectedId === record.id;
        return (
          <Card
            key={record.id}
            className={cn(
              "p-4 space-y-4 transition",
              isActive ? "ring-2 ring-primary/40" : undefined
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">物流记录</h3>
                  <Badge className={cn("border text-xs font-medium", statusMeta.tone)}>
                    {statusMeta.label}
                  </Badge>
                  {record.destination && (
                    <Badge variant="outline" className="text-xs">
                      {record.destination === "CUSTOMER"
                        ? "直发客户"
                        : record.destination === "FORWARDER"
                          ? "转运仓"
                          : "仓库"}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {record.trackingNo ? `运单号：${record.trackingNo}` : "尚未录入运单号"}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onSelectRecord?.(record)}>
                查看详情
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs text-gray-500">出发 / 到达</p>
                <p className="text-sm text-gray-800">
                  {record.fromNode || record.fromCountry || "未知"} →{" "}
                  {record.toNode || record.toCountry || "未知"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDate(record.departedAt)} ~ {formatDate(record.arrivedAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">费用</p>
                <p className="text-sm text-gray-800">
                  {record.cost ? `${record.cost} ${record.currency || ""}` : "未录入"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">关联</p>
                <p className="text-sm text-gray-800">
                  {record.relatedType} · {record.relatedId}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  创建于 {formatDate(record.createdAt)}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default LogisticsTracker;
