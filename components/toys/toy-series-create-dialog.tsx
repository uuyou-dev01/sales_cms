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
import { Plus, Trash2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// 系列创建表单数据
interface SeriesFormData {
  name: string;
  image?: string;
  brandName: string; // 品牌名称输入
  skus: Array<{
    id: string;
    name: string;
    variant: string; // 普通款或隐藏款
    stock: number;
    costPrice: number;
    price: number;
    imageUrl: string;
  }>;
}

interface ToySeriesCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ToySeriesCreateDialog({
  isOpen,
  onClose,
  onSuccess,
}: ToySeriesCreateDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<SeriesFormData>({
    name: "",
    image: "",
    brandName: "",
    skus: [],
  });
  const [loading, setLoading] = useState(false);

  // 关闭对话框时重置表单
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: "",
        image: "",
        brandName: "",
        skus: [],
      });
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "验证失败",
        description: "请输入系列名称",
        variant: "destructive",
      });
      return;
    }

    if (!formData.brandName.trim()) {
      toast({
        title: "验证失败",
        description: "请输入品牌名称",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/toys/series", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          image: formData.image,
          brandName: formData.brandName,
          skus: formData.skus,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "创建成功",
          description: `系列"${formData.name}"已创建`,
        });
        onSuccess();
        onClose();
      } else {
        throw new Error(data.message || "创建失败");
      }
    } catch (error) {
      console.error("创建系列失败:", error);
      toast({
        title: "创建失败",
        description: error instanceof Error ? error.message : "请重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSku = () => {
    const newSku = {
      id: Date.now().toString(),
      name: "",
      variant: "普通款",
      stock: 0,
      costPrice: 0,
      price: 0,
      imageUrl: "",
    };
    setFormData({
      ...formData,
      skus: [...formData.skus, newSku],
    });
  };

  const handleRemoveSku = (skuId: string) => {
    setFormData({
      ...formData,
      skus: formData.skus.filter((sku) => sku.id !== skuId),
    });
  };

  const handleSkuChange = (
    skuId: string,
    field: "name" | "variant" | "stock" | "costPrice" | "price" | "imageUrl",
    value: string | number
  ) => {
    setFormData({
      ...formData,
      skus: formData.skus.map((sku) => {
        if (sku.id !== skuId) return sku;
        return { ...sku, [field]: value };
      }),
    });
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新增系列</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>系列名称 *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="例如：迪士尼family系列"
              />
            </div>

            <div className="space-y-2">
              <Label>品牌名称 *</Label>
              <Input
                value={formData.brandName}
                onChange={(e) =>
                  setFormData({ ...formData, brandName: e.target.value })
                }
                placeholder="例如：泡泡玛特"
              />
            </div>
          </div>


          <div className="space-y-2">
            <Label>系列主图</Label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
                className="hidden"
                id="series-image-upload"
              />
              <label
                htmlFor="series-image-upload"
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
              >
                <Upload className="w-4 h-4" />
                上传图片
              </label>
              {formData.image && (
                <img
                  src={formData.image}
                  alt="系列主图"
                  className="w-20 h-20 object-cover rounded-md"
                />
              )}
            </div>
          </div>

          {/* SKU管理 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">SKU管理</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSku}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                添加SKU
              </Button>
            </div>

            {formData.skus.map((sku) => (
              <div
                key={sku.id}
                className="p-4 border border-gray-200 rounded-lg space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">SKU {formData.skus.indexOf(sku) + 1}</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveSku(sku.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>SKU名称 *</Label>
                    <Input
                      value={sku.name}
                      onChange={(e) =>
                        handleSkuChange(sku.id, "name", e.target.value)
                      }
                      placeholder="例如：端盒"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>款式 *</Label>
                    <select
                      value={sku.variant}
                      onChange={(e) =>
                        handleSkuChange(sku.id, "variant", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="普通款">普通款</option>
                      <option value="隐藏款">隐藏款</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>初始库存</Label>
                    <Input
                      type="number"
                      value={sku.stock}
                      onChange={(e) =>
                        handleSkuChange(sku.id, "stock", parseInt(e.target.value) || 0)
                      }
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>成本价（RMB）</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={sku.costPrice}
                      onChange={(e) =>
                        handleSkuChange(sku.id, "costPrice", parseFloat(e.target.value) || 0)
                      }
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>建议售价（日元）</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={sku.price}
                      onChange={(e) =>
                        handleSkuChange(sku.id, "price", parseFloat(e.target.value) || 0)
                      }
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>SKU图片</Label>
                    <Input
                      value={sku.imageUrl}
                      onChange={(e) =>
                        handleSkuChange(sku.id, "imageUrl", e.target.value)
                      }
                      placeholder="图片URL"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "创建中..." : "创建系列"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}