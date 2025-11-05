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
import { Upload, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ToySeriesManageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  seriesId: string;
  seriesName: string;
  seriesDescription?: string;
  seriesImage?: string;
  onUpdate: (data: { name: string; description: string; image: string }) => void;
  onDelete: () => void;
}

export function ToySeriesManageDialog({
  isOpen,
  onClose,
  seriesId,
  seriesName,
  seriesDescription,
  seriesImage,
  onUpdate,
  onDelete,
}: ToySeriesManageDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: seriesName,
        description: seriesDescription || "",
        image: seriesImage || "",
      });
    }
  }, [isOpen, seriesName, seriesDescription, seriesImage]);

  const handleUpdate = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "验证失败",
        description: "请输入系列名称",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/toys/series/${seriesId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          image: formData.image,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        toast({
          title: "更新成功",
          description: `系列"${formData.name}"已更新`,
        });
        onUpdate(formData);
        onClose();
      } else {
        throw new Error(data.message || "更新失败");
      }
    } catch (error) {
      console.error("更新系列失败:", error);
      toast({
        title: "更新失败",
        description: error instanceof Error ? error.message : "请重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`确定要删除系列"${seriesName}"吗？这将删除该系列下的所有SKU数据！`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/toys/series/${seriesId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        toast({
          title: "删除成功",
          description: `系列"${seriesName}"已删除`,
        });
        onDelete();
        onClose();
      } else {
        throw new Error(data.message || "删除失败");
      }
    } catch (error) {
      console.error("删除系列失败:", error);
      toast({
        title: "删除失败",
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
          <DialogTitle>管理系列 - {seriesName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 基本信息 */}
          <div className="space-y-4">
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
              <Label>系列描述</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="输入系列描述..."
                rows={3}
              />
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
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {loading ? "删除中..." : "删除系列"}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              取消
            </Button>
            <Button onClick={handleUpdate} disabled={loading}>
              <Edit className="w-4 h-4 mr-2" />
              {loading ? "更新中..." : "保存"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
