"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { EmojiIcons } from "@/components/emoji-icons";

// 商品分类选项
const ITEM_CATEGORIES = [
  { value: "服装", label: "服装", icon: "👕" },
  { value: "鞋子", label: "鞋子", icon: "👟" },
  { value: "包包", label: "包包", icon: "👜" },
  { value: "配饰", label: "配饰", icon: "💍" },
  { value: "3C&配件", label: "3C&配件", icon: "📱" },
  { value: "潮玩类", label: "潮玩类", icon: "🧸" },
  { value: "其他", label: "其他", icon: "📦" },
];

interface EditSKUFormProps {
  initialData: {
    itemId: string;
    itemName: string;
    itemNumber: string;
    itemType: string;
    itemBrand?: string;
    itemCondition?: string;
    itemColor?: string;
    itemSize?: string;
    itemRemarks?: string;
    photos?: string[];
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export function EditSKUForm({ initialData, onSuccess, onCancel }: EditSKUFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState({
    itemName: initialData.itemName || "",
    itemNumber: initialData.itemNumber || "",
    itemType: initialData.itemType || "",
    itemBrand: initialData.itemBrand || "",
    itemCondition: initialData.itemCondition || "全新",
    itemColor: initialData.itemColor || "",
    itemSize: initialData.itemSize || "均码",
    itemRemarks: initialData.itemRemarks || "",
  });

  // 处理表单字段变化
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证必填字段
    if (!formData.itemName.trim()) {
      toast({
        title: "验证失败",
        description: "请输入商品名称",
        variant: "destructive",
      });
      return;
    }

    if (!formData.itemType) {
      toast({
        title: "验证失败",
        description: "请选择商品分类",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 构造更新数据
      const updateData = {
        itemId: initialData.itemId,
        itemName: formData.itemName.trim(),
        itemNumber: formData.itemNumber.trim(),
        itemType: formData.itemType,
        itemBrand: formData.itemBrand.trim(),
        itemCondition: formData.itemCondition,
        itemColor: formData.itemColor.trim(),
        itemSize: formData.itemSize,
        itemRemarks: formData.itemRemarks.trim(),
      };

      // 调用更新SKU API
      const response = await fetch("/api/items/update-sku", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "更新商品失败");
      }

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "🎉 更新成功！",
          description: `商品 ${updateData.itemName} 已成功更新`,
          duration: 3000,
        });

        onSuccess();
      } else {
        throw new Error(result.error || "更新商品失败");
      }
    } catch (error) {
      console.error("更新商品失败:", error);
      toast({
        title: "更新失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 商品基本信息 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">基本信息</h3>
        
        {/* SKU ID (只读) */}
        <div className="space-y-2">
          <Label htmlFor="itemId">SKU ID</Label>
          <Input
            id="itemId"
            value={initialData.itemId}
            disabled
            className="bg-gray-100"
          />
        </div>

        {/* 商品名称 */}
        <div className="space-y-2">
          <Label htmlFor="itemName">
            商品名称 <span className="text-red-500">*</span>
          </Label>
          <Input
            id="itemName"
            value={formData.itemName}
            onChange={(e) => handleInputChange("itemName", e.target.value)}
            placeholder="请输入商品名称"
            required
          />
        </div>

        {/* 货号 */}
        <div className="space-y-2">
          <Label htmlFor="itemNumber">货号</Label>
          <Input
            id="itemNumber"
            value={formData.itemNumber}
            onChange={(e) => handleInputChange("itemNumber", e.target.value)}
            placeholder="请输入货号"
          />
        </div>

        {/* 商品分类 */}
        <div className="space-y-2">
          <Label htmlFor="itemType">
            商品分类 <span className="text-red-500">*</span>
          </Label>
          <Select value={formData.itemType} onValueChange={(value) => handleInputChange("itemType", value)}>
            <SelectTrigger>
              <SelectValue placeholder="选择商品分类" />
            </SelectTrigger>
            <SelectContent>
              {ITEM_CATEGORIES.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  <div className="flex items-center gap-2">
                    <span>{category.icon}</span>
                    <span>{category.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 品牌 */}
        <div className="space-y-2">
          <Label htmlFor="itemBrand">品牌</Label>
          <Input
            id="itemBrand"
            value={formData.itemBrand}
            onChange={(e) => handleInputChange("itemBrand", e.target.value)}
            placeholder="请输入品牌"
          />
        </div>

        {/* 颜色 */}
        <div className="space-y-2">
          <Label htmlFor="itemColor">颜色</Label>
          <Input
            id="itemColor"
            value={formData.itemColor}
            onChange={(e) => handleInputChange("itemColor", e.target.value)}
            placeholder="请输入颜色"
          />
        </div>

        {/* 尺码 */}
        <div className="space-y-2">
          <Label htmlFor="itemSize">尺码</Label>
          <Input
            id="itemSize"
            value={formData.itemSize}
            onChange={(e) => handleInputChange("itemSize", e.target.value)}
            placeholder="请输入尺码"
          />
        </div>

        {/* 成色 */}
        <div className="space-y-2">
          <Label htmlFor="itemCondition">成色</Label>
          <Select value={formData.itemCondition} onValueChange={(value) => handleInputChange("itemCondition", value)}>
            <SelectTrigger>
              <SelectValue placeholder="选择成色" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="全新">全新</SelectItem>
              <SelectItem value="9成新">9成新</SelectItem>
              <SelectItem value="8成新">8成新</SelectItem>
              <SelectItem value="7成新">7成新</SelectItem>
              <SelectItem value="6成新">6成新</SelectItem>
              <SelectItem value="5成新及以下">5成新及以下</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 备注 */}
        <div className="space-y-2">
          <Label htmlFor="itemRemarks">备注</Label>
          <Textarea
            id="itemRemarks"
            value={formData.itemRemarks}
            onChange={(e) => handleInputChange("itemRemarks", e.target.value)}
            placeholder="请输入备注信息"
            rows={3}
          />
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          取消
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              更新中...
            </>
          ) : (
            <>
              <span className="mr-2">{EmojiIcons.Save}</span>
              保存更改
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
