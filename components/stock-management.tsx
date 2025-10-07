"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { EmojiIcons } from "@/components/emoji-icons";
import { Badge } from "@/components/ui/badge";

interface StockItem {
  itemId: string;
  itemSize: string;
  currentStatus: string;
  purchasePrice: number;
  warehousePosition?: string;
}

interface StockManagementProps {
  itemNumber: string;
  stockItems: StockItem[];
  onStockUpdate: () => void;
}

// 状态选项
const STATUS_OPTIONS = [
  { value: "在途（国内）", label: "在途（国内）", color: "bg-yellow-100 text-yellow-800" },
  { value: "在途（国际）", label: "在途（国际）", color: "bg-orange-100 text-orange-800" },
  { value: "在库", label: "在库", color: "bg-green-100 text-green-800" },
  { value: "已售出", label: "已售出", color: "bg-blue-100 text-blue-800" },
  { value: "已退货", label: "已退货", color: "bg-red-100 text-red-800" },
];

export function StockManagement({ itemNumber, stockItems, onStockUpdate }: StockManagementProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedItems, setSelectedItems] = React.useState<string[]>([]);
  const [newStatus, setNewStatus] = React.useState("");

  // 批量更新状态
  const handleBatchStatusUpdate = async () => {
    if (selectedItems.length === 0 || !newStatus) {
      toast({
        title: "请选择商品和状态",
        description: "请至少选择一个商品和目标状态",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/items/batch-update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemIds: selectedItems,
          newStatus: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("更新失败");
      }

      toast({
        title: "更新成功",
        description: `已成功更新 ${selectedItems.length} 个商品的状态`,
      });

      setSelectedItems([]);
      setNewStatus("");
      setIsDialogOpen(false);
      onStockUpdate();
    } catch (error) {
      console.error("更新状态失败:", error);
      toast({
        title: "更新失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 切换商品选择
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedItems.length === stockItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(stockItems.map(item => item.itemId));
    }
  };

  // 按状态分组
  const groupedByStatus = stockItems.reduce((acc, item) => {
    const status = item.currentStatus || "在途（国内）";
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(item);
    return acc;
  }, {} as Record<string, StockItem[]>);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span className="text-lg">{EmojiIcons.Package}</span>
            库存管理
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <span className="text-lg mr-1">{EmojiIcons.Edit}</span>
                批量管理
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>批量管理库存状态</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* 操作区域 */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === stockItems.length && stockItems.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                    <Label>全选 ({selectedItems.length}/{stockItems.length})</Label>
                  </div>
                  
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="选择新状态" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={option.color}>
                              {option.label}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    onClick={handleBatchStatusUpdate}
                    disabled={isSubmitting || selectedItems.length === 0 || !newStatus}
                  >
                    {isSubmitting ? "更新中..." : `更新 ${selectedItems.length} 个商品`}
                  </Button>
                </div>

                {/* 商品列表 */}
                <div className="space-y-4">
                  {Object.entries(groupedByStatus).map(([status, items]) => (
                    <div key={status} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={
                          STATUS_OPTIONS.find(opt => opt.value === status)?.color || "bg-gray-100 text-gray-800"
                        }>
                          {status}
                        </Badge>
                        <span className="text-sm text-gray-600">({items.length} 件)</span>
                      </div>
                      
                      <div className="grid gap-2">
                        {items.map((item) => (
                          <div key={item.itemId} className="flex items-center gap-3 p-3 border rounded-lg">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(item.itemId)}
                              onChange={() => toggleItemSelection(item.itemId)}
                              className="rounded"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">{item.itemId}</span>
                                <Badge variant="outline">{item.itemSize}码</Badge>
                              </div>
                              <div className="text-sm text-gray-600">
                                进价: ¥{item.purchasePrice.toLocaleString()}
                                {item.warehousePosition && (
                                  <span className="ml-2">位置: {item.warehousePosition}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* 状态统计 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {STATUS_OPTIONS.map((option) => {
            const count = groupedByStatus[option.value]?.length || 0;
            return (
              <div key={option.value} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="font-semibold text-lg">{count}</div>
                <Badge variant="outline" className={`${option.color} text-xs`}>
                  {option.label}
                </Badge>
              </div>
            );
          })}
        </div>

        {/* 快速操作提示 */}
        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{EmojiIcons.Lightbulb}</span>
            <span className="font-medium">快速操作提示：</span>
          </div>
          <ul className="list-disc list-inside space-y-1 ml-6">
            <li>点击"批量管理"可以同时更新多个商品的状态</li>
            <li>支持按状态分组查看，便于管理</li>
            <li>可以将商品从"在途"状态更新为"在库"或"已售出"</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
