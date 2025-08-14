"use client";

import { useState } from "react";
import { EmojiIcons } from "@/components/emoji-icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const { toast } = useToast();
  const [monthFilter, setMonthFilter] = useState<"all" | "current" | "specific">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (monthFilter === "specific" && (!startDate || !endDate)) {
      toast({
        title: "请选择日期范围",
        description: "请选择开始和结束日期",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      const response = await fetch("/api/items/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          monthFilter,
          startDate: monthFilter === "specific" ? startDate : undefined,
          endDate: monthFilter === "specific" ? endDate : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("导出失败");
      }

      // 获取文件名
      const contentDisposition = response.headers.get("content-disposition");
      let filename = "商品数据.csv";
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // 下载文件
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "导出成功",
        description: `已导出 ${filename}`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("导出错误:", error);
      toast({
        title: "导出失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getCurrentMonthRange = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(startOfMonth.toISOString().split('T')[0]);
    setEndDate(endOfMonth.toISOString().split('T')[0]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-lg">{EmojiIcons.Download}</span>
            导出数据设置
          </DialogTitle>
          <DialogDescription>
            选择要导出的数据范围，支持按月份筛选
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 月份筛选选择 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">选择数据范围</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="all"
                  name="monthFilter"
                  value="all"
                  checked={monthFilter === "all"}
                  onChange={(e) => setMonthFilter(e.target.value as "all" | "current" | "specific")}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                />
                <Label htmlFor="all" className="text-sm font-normal cursor-pointer">
                  全部数据
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="current"
                  name="monthFilter"
                  value="current"
                  checked={monthFilter === "current"}
                  onChange={(e) => setMonthFilter(e.target.value as "all" | "current" | "specific")}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                />
                <Label htmlFor="current" className="text-sm font-normal cursor-pointer">
                  当月数据
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="specific"
                  name="monthFilter"
                  value="specific"
                  checked={monthFilter === "specific"}
                  onChange={(e) => setMonthFilter(e.target.value as "all" | "current" | "specific")}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                />
                <Label htmlFor="specific" className="text-sm font-normal cursor-pointer">
                  指定月份
                </Label>
              </div>
            </div>
          </div>

          {/* 指定月份日期选择 */}
          {monthFilter === "specific" && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">选择月份范围</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-xs text-gray-600">
                    开始日期
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="选择开始日期"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-xs text-gray-600">
                    结束日期
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="选择结束日期"
                  />
                </div>
              </div>
              
              {/* 快速选择按钮 */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={getCurrentMonthRange}
                  className="text-xs"
                >
                  <span className="text-lg">{EmojiIcons.Calendar}</span>
                  设为当月
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                    setStartDate(lastMonth.toISOString().split('T')[0]);
                    setEndDate(lastMonthEnd.toISOString().split('T')[0]);
                  }}
                  className="text-xs"
                >
                  <span className="text-lg">{EmojiIcons.Calendar}</span>
                  设为上月
                </Button>
              </div>
            </div>
          )}

          {/* 导出信息提示 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <span className="text-lg">{EmojiIcons.Calendar}</span>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">导出内容说明：</p>
                {monthFilter === "all" && (
                  <p>将导出所有商品数据，包含完整的商品信息和交易记录</p>
                )}
                {monthFilter === "current" && (
                  <p>将导出本月购入的商品数据，适合月度报表分析</p>
                )}
                {monthFilter === "specific" && startDate && endDate && (
                  <p>将导出 {startDate} 至 {endDate} 期间购入的商品数据</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            取消
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="gap-2"
          >
            {isExporting ? (
              <>
                <span className="text-lg">{EmojiIcons.Loader2}</span>
                导出中...
              </>
            ) : (
              <>
                <span className="text-lg">{EmojiIcons.Download}</span>
                开始导出
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
