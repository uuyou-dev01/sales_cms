"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { EmojiIcons } from "@/components/emoji-icons";
import { Upload, X, Plus } from "lucide-react";

interface SeriesSKUFormProps {
  seriesId: string;
  seriesName: string;
  brandName: string;
  onSuccess?: () => void;
}

export function SeriesSKUForm({ seriesId, seriesName, brandName, onSuccess }: SeriesSKUFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [formData, setFormData] = React.useState({
    characterName: "",
    itemNumber: "", // 货号可以手动编辑
    toyVariant: "正常款",
    toyCondition: "未拆盒",
    itemColor: "",
    itemSize: "均码",
    costPrice: "",
    domesticShipping: "100",
    mercariShipping: "180",
    yahooShipping: "170",
    minPrice: "",
    actualPrice: "",
    totalStock: "1",
    itemRemarks: "",
    photos: [] as string[],
  });

  // 自动生成商品名称和建议货号
  const generateItemInfo = () => {
    if (!formData.characterName) return { itemName: "", suggestedItemNumber: "" };

    let itemName = `${brandName} ${seriesName} ${formData.characterName}`;
    if (formData.toyVariant !== "正常款") {
      itemName = `${itemName} - ${formData.toyVariant}`;
    }

    // 简化货号生成：品牌首字母-角色名
    const brandCode = brandName.substring(0, 1).toUpperCase();
    const suggestedItemNumber = `${brandCode}-${formData.characterName}`;
    
    return { itemName, suggestedItemNumber };
  };

  const { itemName, suggestedItemNumber } = generateItemInfo();
  
  // 如果用户没有手动填写货号，使用建议货号
  const finalItemNumber = formData.itemNumber || suggestedItemNumber;

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
        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, ...result.urls]
        }));
        toast({
          title: "图片上传成功",
          description: `已上传 ${result.urls.length} 张图片`,
        });
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

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.characterName.trim()) {
      toast({
        title: "请填写角色名称",
        variant: "destructive",
      });
      return;
    }

    if (!formData.costPrice || parseFloat(formData.costPrice) <= 0) {
      toast({
        title: "请填写有效的成本价格",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // 生成唯一的SKU ID
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const itemId = `${itemNumber}-${timestamp}-${randomSuffix}`;

      // 首先获取或创建角色
      let toyCharacterId = null;
      
      // 检查角色是否存在
      const charactersResponse = await fetch(`/api/toys/characters?seriesId=${seriesId}`);
      if (charactersResponse.ok) {
        const charactersData = await charactersResponse.json();
        const existingCharacter = charactersData.characters?.find(
          (char: any) => char.name === formData.characterName
        );
        
        if (existingCharacter) {
          toyCharacterId = existingCharacter.id;
          // 如果角色已存在且用户上传了新图片，更新角色图片
          if (formData.photos.length > 0 && formData.photos[0] !== existingCharacter.image) {
            await fetch('/api/toys/characters', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                characterId: existingCharacter.id,
                image: formData.photos[0], // 使用第一张图片作为封面
              }),
            });
          }
        } else {
          // 创建新角色
          const createCharacterResponse = await fetch('/api/toys/characters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: formData.characterName,
              seriesId: seriesId,
              description: `${seriesName}系列 - ${formData.characterName}`,
              rarity: formData.toyVariant === "隐藏款" ? "隐藏" : "普通",
              image: formData.photos.length > 0 ? formData.photos[0] : null, // 使用第一张图片作为封面
            }),
          });

          if (createCharacterResponse.ok) {
            const characterData = await createCharacterResponse.json();
            toyCharacterId = characterData.character.id;
          }
        }
      }

      // 创建SKU
      const skuData = {
        itemId,
        itemName,
        itemNumber: finalItemNumber, // 使用最终确定的货号
        itemType: "潮玩类",
        itemBrand: brandName,
        itemCondition: formData.toyCondition,
        itemColor: formData.itemColor,
        itemSize: formData.itemSize,
        itemRemarks: formData.itemRemarks,
        photos: formData.photos,
        toyCharacterId,
        toyVariant: formData.toyVariant,
        toyCondition: formData.toyCondition,
      };

      const response = await fetch('/api/sku', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(skuData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "SKU创建成功",
          description: `${itemName} 已成功添加到系列中`,
        });
        
        // 重置表单
        setFormData({
          characterName: "",
          itemNumber: "",
          toyVariant: "正常款",
          toyCondition: "未拆盒",
          itemColor: "",
          itemSize: "均码",
          costPrice: "",
          domesticShipping: "100",
          mercariShipping: "180",
          yahooShipping: "170",
          minPrice: "",
          actualPrice: "",
          totalStock: "1",
          itemRemarks: "",
          photos: [],
        });

        onSuccess?.();
      } else {
        throw new Error(result.error || "创建SKU失败");
      }
    } catch (error) {
      console.error('创建SKU失败:', error);
      toast({
        title: "创建失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 系列信息显示 */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span>🎭</span>
            为 {brandName} {seriesName} 添加新款式
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">品牌:</span>
              <span className="ml-2 font-medium">{brandName}</span>
            </div>
            <div>
              <span className="text-gray-600">系列:</span>
              <span className="ml-2 font-medium">{seriesName}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 角色信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">角色信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="characterName">角色名称 <span className="text-red-500">*</span></Label>
              <Input
                id="characterName"
                placeholder="例如：米奇、米妮、高飞"
                value={formData.characterName}
                onChange={(e) => setFormData(prev => ({ ...prev, characterName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>变体类型</Label>
              <Select
                value={formData.toyVariant}
                onValueChange={(value) => setFormData(prev => ({ ...prev, toyVariant: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="正常款">正常款</SelectItem>
                  <SelectItem value="隐藏款">隐藏款</SelectItem>
                  <SelectItem value="特别色">特别色</SelectItem>
                  <SelectItem value="限定版">限定版</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>包装状态</Label>
              <Select
                value={formData.toyCondition}
                onValueChange={(value) => setFormData(prev => ({ ...prev, toyCondition: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="未拆盒">未拆盒</SelectItem>
                  <SelectItem value="已拆盒">已拆盒</SelectItem>
                  <SelectItem value="无盒">无盒</SelectItem>
                  <SelectItem value="盒损">盒损</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemColor">颜色 (可选)</Label>
              <Input
                id="itemColor"
                placeholder="例如：红色、蓝色"
                value={formData.itemColor}
                onChange={(e) => setFormData(prev => ({ ...prev, itemColor: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 预览信息 */}
      {formData.characterName && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-base text-green-800">生成预览</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <span className="text-gray-600">商品名称:</span>
              <span className="ml-2 font-medium text-green-800">{itemName}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemNumber">
                货号 
                <span className="text-xs text-gray-500 ml-2">
                  (留空使用建议货号: {suggestedItemNumber})
                </span>
              </Label>
              <Input
                id="itemNumber"
                placeholder={suggestedItemNumber}
                value={formData.itemNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, itemNumber: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 价格信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">价格信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="costPrice">成本价格 (¥) <span className="text-red-500">*</span></Label>
              <Input
                id="costPrice"
                type="number"
                step="0.01"
                placeholder="2600"
                value={formData.costPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, costPrice: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domesticShipping">中国到日本运费 (¥)</Label>
              <Input
                id="domesticShipping"
                type="number"
                value={formData.domesticShipping}
                onChange={(e) => setFormData(prev => ({ ...prev, domesticShipping: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mercariShipping">Mercari平台运费 (¥)</Label>
              <Input
                id="mercariShipping"
                type="number"
                value={formData.mercariShipping}
                onChange={(e) => setFormData(prev => ({ ...prev, mercariShipping: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yahooShipping">ヤフーフリマ平台运费 (¥)</Label>
              <Input
                id="yahooShipping"
                type="number"
                value={formData.yahooShipping}
                onChange={(e) => setFormData(prev => ({ ...prev, yahooShipping: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minPrice">建议最低售价 (¥)</Label>
              <Input
                id="minPrice"
                type="number"
                placeholder="4500"
                value={formData.minPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, minPrice: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actualPrice">实际售价 (¥)</Label>
              <Input
                id="actualPrice"
                type="number"
                placeholder="4780"
                value={formData.actualPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, actualPrice: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 其他信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">其他信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="itemRemarks">商品备注</Label>
            <Input
              id="itemRemarks"
              placeholder="可选的商品备注信息"
              value={formData.itemRemarks}
              onChange={(e) => setFormData(prev => ({ ...prev, itemRemarks: e.target.value }))}
            />
          </div>

          {/* 商品图片上传 */}
          <div className="space-y-3">
            <Label>商品图片</Label>
            
            {/* 图片预览 */}
            {formData.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {formData.photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo}
                      alt={`商品图片 ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border border-gray-200"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* 上传按钮 */}
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                multiple
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
                    <span className="animate-spin">{EmojiIcons.RefreshCw}</span>
                    上传中...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    上传图片
                  </>
                )}
              </Button>
              <span className="text-sm text-gray-500">
                支持多张图片上传，建议尺寸 800x800
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 提交按钮 */}
      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={loading} className="min-w-24">
          {loading ? (
            <>
              <span className="animate-spin mr-2">{EmojiIcons.RefreshCw}</span>
              创建中...
            </>
          ) : (
            <>
              <span className="mr-2">{EmojiIcons.Plus}</span>
              创建SKU
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
