import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { ImageUpload } from "./ImageUpload";
import type { Series, SKU } from "../App";

interface EditSeriesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  series: Series | null;
  onSave: (series: Series) => void;
  isCreating: boolean;
}

export function EditSeriesDialog({
  isOpen,
  onClose,
  series,
  onSave,
  isCreating,
}: EditSeriesDialogProps) {
  const [formData, setFormData] = useState<Series | null>(null);

  useEffect(() => {
    if (series) {
      setFormData({ ...series });
    }
  }, [series]);

  if (!formData) return null;

  const handleSave = () => {
    if (formData.name.trim()) {
      onSave(formData);
      onClose();
    }
  };

  const handleAddSKU = () => {
    const newSku: SKU = {
      id: Date.now().toString(),
      name: "",
      stock: 0,
      price: 0,
      costPrice: 0,
      imageUrl:
        "https://images.unsplash.com/photo-1604257206125-c0d204cb1493?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibGluZCUyMGJveCUyMHRveXxlbnwxfHx8fDE3NjEyMzYzNDh8MA&ixlib=rb-4.1.0&q=80&w=1080",
      batches: [],
    };
    setFormData({
      ...formData,
      skus: [...formData.skus, newSku],
    });
  };

  const handleRemoveSKU = (skuId: string) => {
    setFormData({
      ...formData,
      skus: formData.skus.filter((sku) => sku.id !== skuId),
    });
  };

  const handleSKUChange = (
    skuId: string,
    field: keyof SKU,
    value: string | number,
  ) => {
    setFormData({
      ...formData,
      skus: formData.skus.map((sku) => {
        if (sku.id !== skuId) return sku;
        
        const updatedSku = { ...sku, [field]: value };
        
        // 如果改变库存或成本价，更新或创建初始批次
        if ((field === 'stock' || field === 'costPrice') && updatedSku.stock > 0) {
          const existingBatch = updatedSku.batches.find(b => !b.purchaseOrderId);
          if (existingBatch) {
            updatedSku.batches = updatedSku.batches.map(b => 
              b.id === existingBatch.id 
                ? { ...b, quantity: updatedSku.stock, unitCostPrice: updatedSku.costPrice }
                : b
            );
          } else {
            updatedSku.batches = [{
              id: `initial-${skuId}`,
              skuId,
              quantity: updatedSku.stock,
              inboundDate: new Date().toISOString().split('T')[0],
              unitCostPrice: updatedSku.costPrice,
            }];
          }
        }
        
        return updatedSku;
      }),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isCreating ? "新增系列" : "编辑系列"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 基本信息 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>系列名称</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: e.target.value,
                  })
                }
                placeholder="例如：泡泡玛特萌在一起"
              />
            </div>

            <div className="space-y-2">
              <Label>系列描述</Label>
              <Textarea
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value,
                  })
                }
                placeholder="输入系列描述..."
                rows={3}
              />
            </div>

            <ImageUpload
              label="系列主图"
              value={formData.coverImage}
              onChange={(url) =>
                setFormData({ ...formData, coverImage: url })
              }
              previewClassName="w-48 h-48"
            />
          </div>

          {/* SKU列表 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>SKU列表</Label>
              <Button
                onClick={handleAddSKU}
                size="sm"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                添加SKU
              </Button>
            </div>

            <div className="space-y-4">
              {formData.skus.map((sku, index) => (
                <div
                  key={sku.id}
                  className="p-4 border rounded-lg space-y-3 bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      SKU #{index + 1}
                    </span>
                    <Button
                      onClick={() => handleRemoveSKU(sku.id)}
                      size="sm"
                      variant="ghost"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>名称</Label>
                      <Input
                        value={sku.name}
                        onChange={(e) =>
                          handleSKUChange(
                            sku.id,
                            "name",
                            e.target.value,
                          )
                        }
                        placeholder="例如：米奇"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>初始库存</Label>
                      <Input
                        type="number"
                        value={sku.stock}
                        onChange={(e) =>
                          handleSKUChange(
                            sku.id,
                            "stock",
                            parseInt(e.target.value) || 0,
                          )
                        }
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>收货价格（元）</Label>
                      <Input
                        type="number"
                        value={sku.costPrice}
                        onChange={(e) =>
                          handleSKUChange(
                            sku.id,
                            "costPrice",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>建议售价（元）</Label>
                      <Input
                        type="number"
                        value={sku.price}
                        onChange={(e) =>
                          handleSKUChange(
                            sku.id,
                            "price",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <ImageUpload
                    label="SKU图片"
                    value={sku.imageUrl}
                    onChange={(url) =>
                      handleSKUChange(sku.id, "imageUrl", url)
                    }
                    previewClassName="w-20 h-20"
                  />
                </div>
              ))}

              {formData.skus.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  暂无SKU，点击上方按钮添加
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={!formData.name.trim()}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}