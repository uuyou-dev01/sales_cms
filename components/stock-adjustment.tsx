"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { EmojiIcons } from "@/components/emoji-icons";
import { Save, X, Package } from "lucide-react";

interface StockAdjustmentProps {
  itemId: string;
  itemName: string;
  characterName: string;
  variant: string;
  currentStock: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function StockAdjustment({
  itemId,
  itemName,
  characterName,
  variant,
  currentStock,
  onSuccess,
  onCancel,
}: StockAdjustmentProps) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    adjustmentType: "set", // "set" | "add" | "subtract"
    quantity: currentStock.toString(),
    reason: "",
    remarks: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const quantity = parseInt(formData.quantity) || 0;
    if (quantity < 0) {
      toast({
        title: "库存数量不能为负数",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const adjustmentData = {
        itemId,
        adjustmentType: formData.adjustmentType,
        quantity: quantity,
        currentStock: currentStock,
        reason: formData.reason,
        remarks: formData.remarks,
      };

      const response = await fetch('/api/stock/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adjustmentData),
      });

      const result = await response.json();

      if (result.success || response.ok) {
        toast({
          title: "库存调整成功",
          description: `${characterName} ${variant} 的库存已调整`,
        });
        onSuccess?.();
      } else {
        throw new Error(result.error || "调整失败");
      }
    } catch (error) {
      console.error('库存调整失败:', error);
      toast({
        title: "调整失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getNewStock = () => {
    const quantity = parseInt(formData.quantity) || 0;
    switch (formData.adjustmentType) {
      case "set":
        return quantity;
      case "add":
        return currentStock + quantity;
      case "subtract":
        return Math.max(0, currentStock - quantity);
      default:
        return currentStock;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 商品基本信息 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            库存调整 - {characterName} {variant}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">商品ID:</span>
              <span className="ml-2 font-mono">{itemId}</span>
            </div>
            <div>
              <span className="text-gray-600">当前库存:</span>
              <span className="ml-2 font-semibold text-blue-600">{currentStock}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 调整信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">调整信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>调整方式</Label>
              <Select
                value={formData.adjustmentType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, adjustmentType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="set">设置为指定数量</SelectItem>
                  <SelectItem value="add">增加库存</SelectItem>
                  <SelectItem value="subtract">减少库存</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">
                {formData.adjustmentType === "set" ? "设置数量" : "调整数量"} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                step="1"
                placeholder="数量"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>调整原因</Label>
            <Select
              value={formData.reason}
              onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择调整原因" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="盘点调整">盘点调整</SelectItem>
                <SelectItem value="损坏报废">损坏报废</SelectItem>
                <SelectItem value="丢失">丢失</SelectItem>
                <SelectItem value="退货入库">退货入库</SelectItem>
                <SelectItem value="样品使用">样品使用</SelectItem>
                <SelectItem value="其他">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">备注</Label>
            <Textarea
              id="remarks"
              placeholder="调整备注信息"
              value={formData.remarks}
              onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* 调整预览 */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-base text-green-800">调整预览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-gray-600">当前库存</div>
              <div className="font-semibold text-blue-600">{currentStock}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-600">调整方式</div>
              <div className="font-semibold text-gray-800">
                {formData.adjustmentType === "set" && "设置为"}
                {formData.adjustmentType === "add" && "增加"}
                {formData.adjustmentType === "subtract" && "减少"}
                {" " + (formData.quantity || "0")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-600">调整后库存</div>
              <div className={`font-semibold ${getNewStock() > currentStock ? 'text-green-600' : getNewStock() < currentStock ? 'text-red-600' : 'text-gray-600'}`}>
                {getNewStock()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 提交按钮 */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          取消
        </Button>
        <Button type="submit" disabled={loading} className="min-w-24">
          {loading ? (
            <>
              <span className="animate-spin mr-2">{EmojiIcons.RefreshCw}</span>
              调整中...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              确认调整
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
