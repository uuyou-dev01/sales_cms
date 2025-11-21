"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, Upload, Link as LinkIcon, Image as ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { SKU } from "@prisma/client";

type SmartSkuInitialData = Partial<SKU> & {
  category?: { id: string } | null;
  attributes?: Record<string, unknown> | null;
};

interface SmartSKUFormProps {
  onSuccess?: (result?: { id: string; name?: string }) => void;
  initialData?: SmartSkuInitialData; // 用于编辑模式
  navigationMode?: 'detail' | 'list' | 'stay' | 'continue'; // 跳转模式
}

function parseAttributes(attributes?: Record<string, unknown> | null) {
  if (!attributes || Array.isArray(attributes)) return {};
  return attributes;
}

export function SmartSKUForm({ onSuccess, initialData, navigationMode = 'detail' }: SmartSKUFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  const resetTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const isFormActiveRef = React.useRef(true);
  
  // 分类列表
  const [categories, setCategories] = React.useState<Array<{ id: string; name: string; level?: number }>>([]);
  
  // SKU 基础字段（对应 Prisma SKU）
  const [sku, setSku] = React.useState({
    name: initialData?.name || "",
    skuNumber: initialData?.skuNumber || "",
    brand: initialData?.brand || "",
    // 确保 categoryId 始终是字符串，使用 "__none__" 作为默认值而不是空字符串
    categoryId: initialData?.categoryId ?? initialData?.category?.id ?? "__none__",
    unit: initialData?.unit || "__none__",
    isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
  });

  const initialAttributeMap = React.useMemo(() => parseAttributes(initialData?.attributes), [initialData]);

  // SKU 主图（存储在 attributes.mainPhoto 中）
  const [mainPhoto, setMainPhoto] = React.useState<string>(
    typeof initialAttributeMap.mainPhoto === "string" ? (initialAttributeMap.mainPhoto as string) : ""
  );
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [imageUrlInput, setImageUrlInput] = React.useState("");

  // 动态属性（友好的表单字段）
  const [attributes, setAttributes] = React.useState({
    color: typeof initialAttributeMap.color === "string" ? initialAttributeMap.color : "",
    material: typeof initialAttributeMap.material === "string" ? initialAttributeMap.material : "",
    series: typeof initialAttributeMap.series === "string" ? initialAttributeMap.series : "",
    description: typeof initialAttributeMap.description === "string" ? initialAttributeMap.description : "",
  });

  // 当初始数据变更时，重置表单（用于编辑模式）
  React.useEffect(() => {
    if (!initialData) return;

    setSku({
      name: initialData.name || "",
      skuNumber: initialData.skuNumber || "",
      brand: initialData.brand || "",
      categoryId: initialData.categoryId ?? initialData.category?.id ?? "",
      unit: initialData.unit || "",
      isActive: initialData.isActive !== undefined ? initialData.isActive : true,
    });

    const nextAttributes = parseAttributes(initialData.attributes);
    setMainPhoto(typeof nextAttributes.mainPhoto === "string" ? (nextAttributes.mainPhoto as string) : "");
    setAttributes({
      color: typeof nextAttributes.color === "string" ? nextAttributes.color : "",
      material: typeof nextAttributes.material === "string" ? nextAttributes.material : "",
      series: typeof nextAttributes.series === "string" ? nextAttributes.series : "",
      description: typeof nextAttributes.description === "string" ? nextAttributes.description : "",
    });
  }, [initialData]);

  // 确保只在客户端渲染
  React.useEffect(() => {
    setIsMounted(true);
    return () => {
      isFormActiveRef.current = false;
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    };
  }, []);

  // 获取分类列表（只在客户端执行）
  React.useEffect(() => {
    if (!isMounted) return;
    
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        // API 返回格式: { data: { items: [...] } }
        const items = data?.data?.items || data?.items || [];
        if (Array.isArray(items) && items.length > 0) {
          setCategories(items);
        } else {
          console.warn("分类列表为空或格式不正确:", data);
        }
      })
      .catch((error) => {
        console.error("获取分类失败:", error);
        toast({
          title: "获取分类失败",
          description: "无法加载分类列表，请刷新页面重试",
          variant: "destructive",
        });
      });
  }, [isMounted, toast]);

  // 图片上传处理
  const handleImageUpload = async (files: FileList) => {
    if (!files.length) return;

    setUploadingImage(true);
    try {
      const formDataUpload = new FormData();
      Array.from(files).forEach((file) => {
        formDataUpload.append("file", file);
      });

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formDataUpload,
      });

      if (response.ok) {
        const result = await response.json();
        const uploadedUrls = result.urls || (result.url ? [result.url] : []);
        if (uploadedUrls.length > 0) {
          setMainPhoto(uploadedUrls[0]); // SKU主图只取第一张
          toast({
            title: "图片上传成功",
            description: "SKU主图已上传",
          });
        }
      } else {
        throw new Error("图片上传失败");
      }
    } catch (error) {
      toast({
        title: "上传失败",
        description: error instanceof Error ? error.message : "图片上传失败，请重试",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // 添加网络图片链接
  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) {
      toast({
        title: "请输入图片链接",
        variant: "destructive",
      });
      return;
    }

    try {
      new URL(imageUrlInput);
      setMainPhoto(imageUrlInput.trim());
      setImageUrlInput("");
      toast({
        title: "图片链接已添加",
      });
    } catch {
      toast({
        title: "无效的图片链接",
        description: "请输入有效的 URL 地址",
        variant: "destructive",
      });
    }
  };

  // 删除图片
  const removeImage = () => {
    setMainPhoto("");
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证必填字段
    if (!sku.name) {
      toast({
        title: "请填写必填字段",
        description: "SKU 名称为必填项",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 构建 attributes（包含主图和动态属性）
      const attributesData: Record<string, unknown> = {};
      
      // 添加主图
      if (mainPhoto) {
        attributesData.mainPhoto = mainPhoto;
      }
      
      // 添加动态属性（只添加有值的）
      if (attributes.color) attributesData.color = attributes.color;
      if (attributes.material) attributesData.material = attributes.material;
      if (attributes.series) attributesData.series = attributes.series;
      if (attributes.description) attributesData.description = attributes.description;

      const payload: Record<string, unknown> = {
        name: sku.name.trim(),
        skuNumber: sku.skuNumber?.trim() || undefined,
        brand: sku.brand?.trim() || undefined,
        unit: sku.unit && sku.unit !== '__none__' ? sku.unit : undefined,
        attributes: Object.keys(attributesData).length > 0 ? attributesData : undefined,
        isActive: sku.isActive,
      };

      if (sku.categoryId && sku.categoryId !== '__none__') {
        // 只传递 categoryId 和 categoryName，不传递 category.connect
        // 后端会根据 categoryId 自动处理分类关联
        payload.categoryId = sku.categoryId;
        
        // 尝试从多个来源获取分类名称
        const selectedCategory = categories.find(cat => cat.id === sku.categoryId);
        const categoryNameFromList = selectedCategory?.name;
        const categoryNameFromInitial = initialData?.category?.name;
        
        console.log('🔍 查找分类名称:', {
          categoryId: sku.categoryId,
          categoriesCount: categories.length,
          selectedCategory: selectedCategory ? { id: selectedCategory.id, name: selectedCategory.name } : null,
          categoryNameFromList,
          categoryNameFromInitial,
        });
        
        if (categoryNameFromList) {
          payload.categoryName = categoryNameFromList;
          console.log('✅ 使用列表中的分类名称:', categoryNameFromList);
        } else if (categoryNameFromInitial) {
          payload.categoryName = categoryNameFromInitial;
          console.log('✅ 使用初始数据中的分类名称:', categoryNameFromInitial);
        } else {
          // 如果找不到分类名称，记录警告（但不阻止提交，让后端处理）
          console.warn('⚠️ 无法找到分类名称，categoryId:', sku.categoryId, 'categories:', categories.length);
          console.warn('⚠️ 这将导致后端无法自动创建分类，如果分类不存在会返回错误');
        }
        // 如果都没有 categoryName，后端会尝试根据 ID 查找，如果不存在会返回错误
        
        // 注意：不在这里设置 payload.category，让后端根据 categoryId 自动处理
      } else if (initialData?.categoryId || initialData?.category?.id) {
        // 编辑模式下，如果原来有分类但现在要移除，明确断开
        payload.category = { disconnect: true };
      }

      // 如果是编辑模式，使用 PUT
      const method = initialData?.id ? "PUT" : "POST";
      const url = initialData?.id ? `/api/sku/${initialData.id}` : "/api/sku";

      // 调试日志：记录发送的数据
      console.log('📤 发送 SKU 创建请求:', {
        url,
        method,
        payload: {
          ...payload,
          // 避免打印太大的对象
          attributes: payload.attributes ? '[Object]' : undefined,
        },
      });

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = "创建SKU失败";
        let errorDescription = "请检查输入信息后重试";
        try {
          const errorData = await response.json();
          console.error('❌ SKU 创建失败:', {
            status: response.status,
            statusText: response.statusText,
            errorData,
          });
          // 详细展开 errorData
          console.error('❌ 错误详情:', JSON.stringify(errorData, null, 2));
          
          // API 返回格式: { error: 'CODE', message: '...' } 或 { error: 'CODE' }
          errorMessage = errorData?.message || errorData?.error || errorMessage;
          if (errorData?.message) {
            errorDescription = errorData.message;
          } else if (errorMessage.includes('分类') || errorMessage.includes('CATEGORY')) {
            errorDescription = "请先在分类管理页面创建分类，或刷新页面后重试";
          } else if (errorMessage.includes('同名') || errorMessage.includes('DUPLICATE')) {
            errorDescription = "请更换 SKU 名称或品牌";
          }
        } catch (parseError) {
          console.error('❌ 解析错误响应失败:', parseError);
          // 尝试重新读取响应
          try {
            const text = await response.clone().text();
            console.error('响应内容 (文本):', text);
            // 尝试解析为 JSON
            try {
              const json = JSON.parse(text);
              console.error('响应内容 (JSON):', json);
              errorMessage = json?.message || json?.error || errorMessage;
              errorDescription = json?.message || errorDescription;
            } catch {
              // 不是 JSON，使用文本
              errorDescription = text || errorDescription;
            }
          } catch {
            console.error('无法读取响应内容');
          }
        }
        toast({
          title: errorMessage,
          description: errorDescription,
          variant: "destructive",
        });
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (result.success !== false) {
        setIsSuccess(true);

        const createdSkuId = result.data?.id || result.id;

        toast({
          title: initialData?.id ? "🎉 SKU更新成功！" : "🎉 SKU创建成功！",
          description: `SKU ${sku.name} 已成功${initialData?.id ? '更新' : '创建'}。`,
          duration: 4000,
        });

        // 调用 onSuccess 回调，传递创建结果
        onSuccess?.(createdSkuId ? { id: createdSkuId, name: sku.name } : undefined);

        // 如果是 'continue' 模式，不重置表单
        if (navigationMode === 'continue' && !initialData?.id) {
          // 只重置部分字段，保留一些信息方便继续创建
          setSku({ name: "", skuNumber: "", brand: sku.brand, categoryId: sku.categoryId, unit: sku.unit, isActive: true });
          setMainPhoto("");
          setImageUrlInput("");
          setAttributes({ color: "", material: "", series: "", description: "" });
          setIsSuccess(false);
          return;
        }

        if (!initialData?.id) {
          if (resetTimerRef.current) {
            clearTimeout(resetTimerRef.current);
          }
          resetTimerRef.current = setTimeout(() => {
            if (!isFormActiveRef.current) {
              resetTimerRef.current = null;
              return;
            }
            setSku({ name: "", skuNumber: "", brand: "", categoryId: "", unit: "", isActive: true });
            setMainPhoto("");
            setImageUrlInput("");
            setAttributes({ color: "", material: "", series: "", description: "" });
            setIsSuccess(false);
            resetTimerRef.current = null;
          }, 500);
        } else {
          setIsSuccess(false);
        }
      } else {
        throw new Error(result.error || "操作失败");
      }
    } catch (error) {
      toast({
        title: "操作失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* SKU 基础信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">SKU 基础信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SKU名称 */}
            <div className="space-y-2">
              <Label>
                SKU 名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                value={sku.name}
                onChange={(e) => setSku({ ...sku, name: e.target.value })}
                placeholder="如：AJ1 Bred 或 米奇家族萌在一起系列"
                required
              />
              <p className="text-xs text-gray-500">产品名称或系列名称</p>
            </div>

            {/* 货号 */}
            <div className="space-y-2">
              <Label>货号（可选）</Label>
              <Input
                value={sku.skuNumber}
                onChange={(e) => setSku({ ...sku, skuNumber: e.target.value })}
                placeholder="如：555088-001"
              />
              <p className="text-xs text-gray-500">用于搜索和识别</p>
            </div>

            {/* 品牌 */}
            <div className="space-y-2">
              <Label>品牌</Label>
              <Input
                value={sku.brand}
                onChange={(e) => setSku({ ...sku, brand: e.target.value })}
                placeholder="如：Nike、泡泡玛特"
              />
            </div>

            {/* 分类（下拉选择） */}
            <div className="space-y-2">
              <Label>分类</Label>
              {isMounted ? (
                <Select
                  value={sku.categoryId ?? "__none__"}
                  onValueChange={(value) => setSku({ ...sku, categoryId: value === "__none__" ? "__none__" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="__none__">无分类</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {`${cat.level && cat.level > 1 ? "— ".repeat(cat.level - 1) : ""}${cat.name}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="加载中..." />
                  </SelectTrigger>
                </Select>
              )}
              <p className="text-xs text-gray-500">
                已显示全部层级分类，如需新增请前往分类管理。
              </p>
            </div>

            {/* 单位 */}
            <div className="space-y-2">
              <Label>单位</Label>
              <Select
                value={sku.unit ?? "__none__"}
                onValueChange={(value) => setSku({ ...sku, unit: value === "__none__" ? "__none__" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择单位" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">无单位</SelectItem>
                  <SelectItem value="件">件</SelectItem>
                  <SelectItem value="盒">盒</SelectItem>
                  <SelectItem value="套">套</SelectItem>
                  <SelectItem value="双">双</SelectItem>
                  <SelectItem value="个">个</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 是否启用 */}
            <div className="space-y-2">
              <Label>状态</Label>
              <div className="flex items-center gap-3 pt-2">
                <Checkbox
                  id="isActive"
                  checked={sku.isActive}
                  onCheckedChange={(checked) => setSku({ ...sku, isActive: checked as boolean })}
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  {sku.isActive ? "启用" : "禁用"}
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SKU 主图 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            SKU 主图
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 图片预览 */}
          {isMounted && mainPhoto && (
            <div className="relative inline-block">
              <img
                src={mainPhoto}
                alt="SKU主图"
                className="w-48 h-48 object-cover rounded-lg border border-gray-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=图片加载失败';
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6 p-0"
                onClick={removeImage}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* 上传方式选择 */}
          <div className="space-y-3">
            {/* 本地文件上传 */}
            <div className="space-y-2">
              <Label>上传本地图片</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files) {
                      handleImageUpload(e.target.files);
                    }
                  }}
                  disabled={uploadingImage}
                  className="hidden"
                  id="image-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('image-upload')?.click()}
                  disabled={uploadingImage}
                  className="flex items-center gap-2"
                >
                  {uploadingImage ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      上传中...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      选择图片
                    </>
                  )}
                </Button>
                <span className="text-sm text-gray-500">
                  建议尺寸 800x800
                </span>
              </div>
            </div>

            {/* 网络链接输入 */}
            <div className="space-y-2">
              <Label>添加网络图片链接</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddImageUrl();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddImageUrl}
                  className="flex items-center gap-2"
                >
                  <LinkIcon className="h-4 w-4" />
                  添加
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 动态属性（友好表单） */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">扩展信息（可选）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 颜色 */}
            <div className="space-y-2">
              <Label>颜色</Label>
              <Input
                value={attributes.color}
                onChange={(e) => setAttributes({ ...attributes, color: e.target.value })}
                placeholder="如：红色、蓝色"
              />
            </div>

            {/* 材质 */}
            <div className="space-y-2">
              <Label>材质</Label>
              <Input
                value={attributes.material}
                onChange={(e) => setAttributes({ ...attributes, material: e.target.value })}
                placeholder="如：皮革、布料"
              />
            </div>

            {/* 系列 */}
            <div className="space-y-2">
              <Label>系列</Label>
              <Input
                value={attributes.series}
                onChange={(e) => setAttributes({ ...attributes, series: e.target.value })}
                placeholder="如：米奇家族萌在一起系列"
              />
            </div>

            {/* 描述 */}
            <div className="space-y-2 md:col-span-2">
              <Label>描述</Label>
              <Input
                value={attributes.description}
                onChange={(e) => setAttributes({ ...attributes, description: e.target.value })}
                placeholder="其他补充信息"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            这些信息将存储在SKU的动态属性中，用于后续查询和筛选
          </p>
        </CardContent>
      </Card>

      {/* 业务说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">ℹ️</div>
          <div>
            <div className="font-semibold text-blue-800">关于SKU创建</div>
            <div className="text-sm text-blue-600">
              创建SKU后，您可以在SKU详情页中添加具体的Item（子SKU），包括尺码、新旧状态、图片等信息。
            </div>
          </div>
        </div>
      </div>

      {/* 成功提示 */}
      {isMounted && isSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🎉</div>
            <div>
              <div className="font-semibold text-green-800">SKU{initialData?.id ? '更新' : '创建'}成功！</div>
              <div className="text-sm text-green-600">
                SKU已成功{initialData?.id ? '更新' : '创建'}，表单将在2秒后自动重置。
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 提交按钮 */}
      <div className="flex justify-end gap-3 pt-6">
        <Button
          type="submit"
          disabled={isSubmitting || isSuccess}
          className={isSuccess 
            ? "bg-green-600 hover:bg-green-700" 
            : "bg-blue-600 hover:bg-blue-700"
          }
        >
          {isSubmitting ? (
            <>
              <span className="text-lg animate-spin mr-2">⏳</span>
              {initialData?.id ? '更新中...' : '创建中...'}
            </>
          ) : isSuccess ? (
            <>
              <span className="text-lg mr-2">✅</span>
              {initialData?.id ? '更新成功！' : '创建成功！'}
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              {initialData?.id ? '更新SKU' : '创建SKU'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
