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
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ToySKU } from "@/lib/toy-types";

interface ToySKUCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  seriesId: string;
  seriesName: string;
  characters: Array<{
    characterName: string;
    variant: string;
    count: number;
    inStock: number;
    sold: number;
  }>;
  skus?: Array<{
    id: string;
    characterId: string;
    name: string;
  }>;
  onSave: (sku: ToySKU) => void;
}

export function ToySKUCreateDialog({
  isOpen,
  onClose,
  seriesId,
  seriesName,
  characters,
  skus = [],
  onSave,
}: ToySKUCreateDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    image: "",
    variant: "普通款", // 普通款或隐藏款
    stock: 0,
    costPrice: 0,
    price: 0,
  });
  const [loading, setLoading] = useState(false);

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: "",
      image: "",
      variant: "普通款",
      stock: 0,
      costPrice: 0,
      price: 0,
    });
  };

  // 关闭对话框时重置表单
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "验证失败",
        description: "请输入SKU名称",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // 先创建角色，然后创建SKU
      const response = await fetch("/api/toys/skus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          seriesId,
          name: formData.name,
          variant: formData.variant,
          description: "",
          image: formData.image,
          currentStock: formData.stock,
          costPrice: formData.costPrice,
          suggestedPrice: formData.price,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "创建成功",
          description: `SKU"${formData.name}"已创建`,
        });
        
        // 创建ToySKU对象
        const newSku: ToySKU = {
          id: data.data.id,
          characterId: data.data.characterId,
          name: formData.name,
          description: "",
          image: formData.image,
          currentStock: formData.stock,
          suggestedPrice: formData.price,
          costPrice: formData.costPrice,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          inventoryBatches: [],
          purchaseOrders: [],
          salesRecords: [],
        };

        onSave(newSku);
        onClose();
      } else {
        throw new Error(data.message || "创建失败");
      }
    } catch (error) {
      console.error("创建SKU失败:", error);
      toast({
        title: "创建失败",
        description: error instanceof Error ? error.message : "请重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setFormData(prev => ({ ...prev, image: data.url }));
        toast({
          title: "上传成功",
          description: "图片已上传",
        });
      } else {
        throw new Error(data.message || "上传失败");
      }
    } catch (error) {
      console.error("图片上传失败:", error);
      toast({
        title: "上传失败",
        description: "请重试",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新增SKU - {seriesName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 基本信息 */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SKU名称 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="例如：端盒"
                />
              </div>

              <div className="space-y-2">
                <Label>款式 *</Label>
                <select
                  value={formData.variant}
                  onChange={(e) =>
                    setFormData({ ...formData, variant: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="普通款">普通款</option>
                  <option value="隐藏款">隐藏款</option>
                </select>
              </div>
            </div>


            <div className="space-y-2">
              <Label>SKU图片</Label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                  className="hidden"
                  id="sku-image-upload"
                />
                <label
                  htmlFor="sku-image-upload"
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
                >
                  <Upload className="w-4 h-4" />
                  上传图片
                </label>
                {formData.image && (
                  <img
                    src={formData.image}
                    alt="SKU图片"
                    className="w-20 h-20 object-cover rounded-md"
                  />
                )}
              </div>
            </div>
          </div>

          {/* 库存和价格信息 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">库存和价格</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>初始库存</Label>
                <Input
                  type="number"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })
                  }
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label>成本价（RMB）</Label>
                <Input
                  type="number"
                  value={formData.costPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label>建议售价（日元）</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "创建中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
