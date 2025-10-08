"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { EmojiIcons } from "@/components/emoji-icons";

interface ToyBrand {
  id: string;
  name: string;
}

interface ToySeries {
  id: string;
  name: string;
  brandId: string;
}

interface ToyInfoFormProps {
  brandName: string;
  seriesName: string;
  characterName: string;
  toyVariant: string;
  toyCondition: string;
  onBrandNameChange: (value: string) => void;
  onSeriesNameChange: (value: string) => void;
  onCharacterNameChange: (value: string) => void;
  onToyVariantChange: (value: string) => void;
  onToyConditionChange: (value: string) => void;
  onAutoFill?: (data: { itemName: string; itemNumber: string }) => void;
  className?: string;
}

export function ToyInfoForm({
  brandName,
  seriesName,
  characterName,
  toyVariant,
  toyCondition,
  onBrandNameChange,
  onSeriesNameChange,
  onCharacterNameChange,
  onToyVariantChange,
  onToyConditionChange,
  onAutoFill,
  className = ""
}: ToyInfoFormProps) {
  const { toast } = useToast();
  const [brands, setBrands] = React.useState<ToyBrand[]>([]);
  const [series, setSeries] = React.useState<ToySeries[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  // 组件挂载
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // 加载品牌列表
  React.useEffect(() => {
    if (mounted) {
      fetchBrands();
    }
  }, [mounted]);

  // 当品牌名称改变时，加载该品牌的系列
  React.useEffect(() => {
    if (brandName) {
      const brand = brands.find(b => b.name === brandName);
      if (brand) {
        fetchSeries(brand.id);
      }
    } else {
      setSeries([]);
    }
  }, [brandName, brands]);

  // 当所有信息填写完整时，自动生成商品名称和货号
  React.useEffect(() => {
    if (brandName && seriesName && characterName && onAutoFill) {
      const generatedName = `${brandName} ${seriesName} ${characterName}`;
      const generatedNumber = `${brandName.substring(0, 2).toUpperCase()}-${seriesName.substring(0, 3).toUpperCase()}-${characterName.substring(0, 2).toUpperCase()}`;
      
      onAutoFill({
        itemName: generatedName,
        itemNumber: generatedNumber
      });
    }
  }, [brandName, seriesName, characterName, onAutoFill]);

  const fetchBrands = async () => {
    try {
      const response = await fetch('/api/toys/brands');
      const data = await response.json();
      if (data.success) {
        setBrands(data.brands);
      }
    } catch (error) {
      console.error('获取品牌失败:', error);
    }
  };

  const fetchSeries = async (brandId: string) => {
    try {
      const response = await fetch(`/api/toys/series?brandId=${brandId}`);
      const data = await response.json();
      if (data.success) {
        setSeries(data.series);
      }
    } catch (error) {
      console.error('获取系列失败:', error);
    }
  };

  const createBrandAndSeries = async () => {
    if (!brandName.trim() || !seriesName.trim()) {
      toast({
        title: "请填写完整信息",
        description: "品牌名称和系列名称不能为空",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // 检查品牌是否已存在
      let brand = brands.find(b => b.name === brandName);
      
      if (!brand) {
        // 创建新品牌
        const brandResponse = await fetch('/api/toys/brands', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: brandName.trim() })
        });
        
        const brandData = await brandResponse.json();
        if (!brandData.success) {
          throw new Error(brandData.error || '创建品牌失败');
        }
        brand = brandData.brand;
        setBrands(prev => [...prev, brand!]);
      }

      // 检查系列是否已存在
      let existingSeries = series.find(s => s.name === seriesName && s.brandId === brand!.id);
      
      if (!existingSeries) {
        // 创建新系列
        const seriesResponse = await fetch('/api/toys/series', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: seriesName.trim(),
            brandId: brand.id
          })
        });
        
        const seriesData = await seriesResponse.json();
        if (!seriesData.success) {
          throw new Error(seriesData.error || '创建系列失败');
        }
        existingSeries = seriesData.series;
        setSeries(prev => [...prev, existingSeries!]);
      }

      toast({
        title: "创建成功",
        description: `品牌 "${brandName}" 和系列 "${seriesName}" 已准备就绪`,
      });

    } catch (error) {
      console.error('创建失败:', error);
      toast({
        title: "创建失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return <div className={`space-y-4 ${className}`}>加载中...</div>;
  }

  return (
    <Card className={`border-orange-200 bg-orange-50 ${className}`}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <span>🧸</span>
          潮玩信息
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 品牌名称 */}
        <div className="space-y-2">
          <Label>品牌名称 <span className="text-red-500">*</span></Label>
          <div className="flex gap-2">
            <Input
              placeholder="例如：泡泡玛特"
              value={brandName}
              onChange={(e) => onBrandNameChange(e.target.value)}
              list="brands-list"
            />
            <datalist id="brands-list">
              {brands.map((brand) => (
                <option key={brand.id} value={brand.name} />
              ))}
            </datalist>
          </div>
        </div>

        {/* 系列名称 */}
        <div className="space-y-2">
          <Label>系列名称 <span className="text-red-500">*</span></Label>
          <div className="flex gap-2">
            <Input
              placeholder="例如：迪士尼family系列"
              value={seriesName}
              onChange={(e) => onSeriesNameChange(e.target.value)}
              list="series-list"
            />
            <datalist id="series-list">
              {series.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
          </div>
        </div>

        {/* 角色名称 */}
        <div className="space-y-2">
          <Label>角色名称 <span className="text-red-500">*</span></Label>
          <Input
            placeholder="例如：米奇、米妮、高飞"
            value={characterName}
            onChange={(e) => onCharacterNameChange(e.target.value)}
          />
        </div>

        {/* 快速创建品牌和系列 */}
        {brandName && seriesName && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <span className="text-sm text-blue-800">
              将创建/使用品牌 "<strong>{brandName}</strong>" 和系列 "<strong>{seriesName}</strong>"
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={createBrandAndSeries}
              disabled={loading}
            >
              {loading ? "创建中..." : "确认创建"}
            </Button>
          </div>
        )}

        {/* 潮玩变体和包装状态 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>变体类型</Label>
            <Select value={toyVariant} onValueChange={onToyVariantChange}>
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

          <div className="space-y-2">
            <Label>包装状态</Label>
            <Select value={toyCondition} onValueChange={onToyConditionChange}>
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
        </div>

        {/* 预览生成的商品信息 */}
        {brandName && seriesName && characterName && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-3">
              <div className="text-sm text-green-800">
                <div className="font-medium">将生成商品:</div>
                <div className="mt-1">
                  📦 <strong>{brandName} {seriesName} {characterName}</strong>
                  {toyVariant !== "正常款" && (
                    <Badge variant="secondary" className="ml-2">
                      {toyVariant}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-green-600 mt-1">
                  货号: {brandName.substring(0, 2).toUpperCase()}-{seriesName.substring(0, 3).toUpperCase()}-{characterName.substring(0, 2).toUpperCase()}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
