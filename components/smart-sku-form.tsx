"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { EmojiIcons } from "@/components/emoji-icons";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToyInfoForm } from "@/components/toy-info-form";

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

interface AutocompleteItem {
  type: string;
  itemName: string;
  itemNumber: string;
  itemBrand?: string;
  itemType?: string;
  count: number;
  displayText: string;
  secondaryText: string;
}

interface WarehouseDistribution {
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  responsible?: string;
  icon?: string;
}

interface SmartSKUFormProps {
  onSuccess: () => void;
}

export function SmartSKUForm({ onSuccess }: SmartSKUFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  
  // 表单数据
  const [formData, setFormData] = React.useState({
    itemId: "",
    itemName: "",
    itemNumber: "",
    itemColor: "",
    itemDescription: "",
    itemType: "",
    costPrice: "",
    shippingCost: "100",
    mercariShipping: "180",
    yahooShipping: "170",
    minPrice: "",
    salePrice: "",
    totalStock: "1",
    photos: [] as string[],
    // 潮玩相关字段
    toyBrandName: "",
    toySeriesName: "",
    toyCharacterName: "",
    toyVariant: "正常款",
    toyCondition: "未拆盒",
  });

  // 自动补全相关状态
  const [nameSuggestions, setNameSuggestions] = React.useState<AutocompleteItem[]>([]);
  const [numberSuggestions, setNumberSuggestions] = React.useState<AutocompleteItem[]>([]);
  const [showNameSuggestions, setShowNameSuggestions] = React.useState(false);
  const [showNumberSuggestions, setShowNumberSuggestions] = React.useState(false);

  // 仓库分布
  const [warehouses, setWarehouses] = React.useState<any[]>([]);
  const [warehouseDistribution, setWarehouseDistribution] = React.useState<WarehouseDistribution[]>([]);

  // 获取仓库数据
  React.useEffect(() => {
    fetch("/api/warehouses")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setWarehouses(data);
          // 初始化仓库分布
          const distribution = data.map((warehouse: any) => ({
            warehouseId: warehouse.id,
            warehouseName: warehouse.name,
            quantity: 0,
            responsible: warehouse.description || "",
            icon: getWarehouseIcon(warehouse.name),
          }));
          setWarehouseDistribution(distribution);
        }
      })
      .catch((error) => {
        console.error("获取仓库数据失败:", error);
      });
  }, []);

  // 获取仓库图标
  const getWarehouseIcon = (name: string) => {
    if (name.includes("家")) return "🏠";
    if (name.includes("公司")) return "🏢";
    return "🏭";
  };

  // 自动生成SKU ID
  React.useEffect(() => {
    if (!formData.itemId) {
      const timestamp = Date.now().toString().slice(-6);
      const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
      setFormData(prev => ({
        ...prev,
        itemId: `SKU-${timestamp}-${randomStr}`
      }));
    }
  }, [formData.itemId]);

  // 商品名称自动补全
  const handleNameSearch = async (value: string) => {
    setFormData(prev => ({ ...prev, itemName: value }));
    
    if (value.length >= 2) {
      try {
        const response = await fetch(`/api/items/autocomplete?q=${encodeURIComponent(value)}&type=name`);
        const data = await response.json();
        setNameSuggestions(data.suggestions || []);
        setShowNameSuggestions(true);
      } catch (error) {
        console.error("商品名称搜索失败:", error);
      }
    } else {
      setShowNameSuggestions(false);
    }
  };

  // 货号自动补全
  const handleNumberSearch = async (value: string) => {
    setFormData(prev => ({ ...prev, itemNumber: value }));
    
    if (value.length >= 2) {
      try {
        const response = await fetch(`/api/items/autocomplete?q=${encodeURIComponent(value)}&type=number`);
        const data = await response.json();
        setNumberSuggestions(data.suggestions || []);
        setShowNumberSuggestions(true);
      } catch (error) {
        console.error("货号搜索失败:", error);
      }
    } else {
      setShowNumberSuggestions(false);
    }
  };

  // 选择商品名称建议
  const selectNameSuggestion = (suggestion: AutocompleteItem) => {
    setFormData(prev => ({
      ...prev,
      itemName: suggestion.itemName,
      itemNumber: suggestion.itemNumber,
      itemType: suggestion.itemType || "",
    }));
    setShowNameSuggestions(false);
  };

  // 选择货号建议
  const selectNumberSuggestion = (suggestion: AutocompleteItem) => {
    setFormData(prev => ({
      ...prev,
      itemNumber: suggestion.itemNumber,
      itemName: suggestion.itemName,
      itemType: suggestion.itemType || "",
    }));
    setShowNumberSuggestions(false);
  };

  // 更新仓库分布
  const updateWarehouseQuantity = (warehouseId: string, quantity: number) => {
    setWarehouseDistribution(prev => 
      prev.map(w => 
        w.warehouseId === warehouseId 
          ? { ...w, quantity: Math.max(0, quantity) }
          : w
      )
    );
  };

  // 计算总库存
  const totalDistributedStock = warehouseDistribution.reduce((sum, w) => sum + w.quantity, 0);

  // 自动分配库存到第一个仓库
  React.useEffect(() => {
    const totalStock = parseInt(formData.totalStock) || 0;
    if (totalStock > 0 && warehouseDistribution.length > 0) {
      const newDistribution = [...warehouseDistribution];
      // 清空所有仓库
      newDistribution.forEach(w => w.quantity = 0);
      // 分配到第一个仓库
      if (newDistribution[0]) {
        newDistribution[0].quantity = totalStock;
      }
      setWarehouseDistribution(newDistribution);
    }
  }, [formData.totalStock]);

  // 计算建议最低售价
  React.useEffect(() => {
    const cost = parseFloat(formData.costPrice) || 0;
    const shipping = parseFloat(formData.shippingCost) || 0;
    const mercari = parseFloat(formData.mercariShipping) || 0;
    
    if (cost > 0) {
      // 建议最低售价 = (成本 + 运费 + 平台费) * 1.3 (30%利润率)
      const minPrice = Math.ceil((cost + shipping + mercari) * 1.3);
      setFormData(prev => ({ ...prev, minPrice: minPrice.toString() }));
    }
  }, [formData.costPrice, formData.shippingCost, formData.mercariShipping]);

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证必填字段
    if (!formData.itemName || !formData.itemType || !formData.costPrice) {
      toast({
        title: "请填写必填字段",
        description: "商品名称、商品分类和成本价格为必填项",
        variant: "destructive",
      });
      return;
    }

    // 验证库存分布
    if (totalDistributedStock !== parseInt(formData.totalStock)) {
      toast({
        title: "库存分布不匹配",
        description: `总库存${formData.totalStock}件，但分布总计${totalDistributedStock}件`,
        variant: "destructive",
      });
      return;
    }

    // 验证售价不低于最低价
    const salePrice = parseFloat(formData.salePrice) || 0;
    const minPrice = parseFloat(formData.minPrice) || 0;
    if (salePrice > 0 && salePrice < minPrice) {
      toast({
        title: "售价过低",
        description: `售价不能低于建议最低售价 ¥${minPrice}`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let toyCharacterId = null;
      
      // 如果是潮玩类，先创建角色记录
      if (formData.itemType === "潮玩类" && formData.toyBrandName && formData.toySeriesName && formData.toyCharacterName) {
        // 获取或创建品牌
        let brandResponse = await fetch('/api/toys/brands');
        let brandData = await brandResponse.json();
        let brand = brandData.brands?.find((b: any) => b.name === formData.toyBrandName);
        
        if (!brand) {
          const createBrandResponse = await fetch('/api/toys/brands', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: formData.toyBrandName })
          });
          const createBrandData = await createBrandResponse.json();
          if (!createBrandData.success) {
            throw new Error(`创建品牌失败: ${createBrandData.error}`);
          }
          brand = createBrandData.brand;
        }

        // 获取或创建系列
        let seriesResponse = await fetch(`/api/toys/series?brandId=${brand.id}`);
        let seriesData = await seriesResponse.json();
        let series = seriesData.series?.find((s: any) => s.name === formData.toySeriesName);
        
        if (!series) {
          const createSeriesResponse = await fetch('/api/toys/series', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              name: formData.toySeriesName,
              brandId: brand.id
            })
          });
          const createSeriesData = await createSeriesResponse.json();
          if (!createSeriesData.success) {
            throw new Error(`创建系列失败: ${createSeriesData.error}`);
          }
          series = createSeriesData.series;
        }

        // 获取或创建角色
        let charactersResponse = await fetch(`/api/toys/characters?seriesId=${series.id}`);
        let charactersData = await charactersResponse.json();
        let character = charactersData.characters?.find((c: any) => c.name === formData.toyCharacterName);
        
        if (!character) {
          const createCharacterResponse = await fetch('/api/toys/characters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              name: formData.toyCharacterName,
              seriesId: series.id,
              rarity: formData.toyVariant === "隐藏款" ? "隐藏" : "普通"
            })
          });
          const createCharacterData = await createCharacterResponse.json();
          if (!createCharacterData.success) {
            throw new Error(`创建角色失败: ${createCharacterData.error}`);
          }
          character = createCharacterData.character;
        }

        toyCharacterId = character.id;
      }

      // 构造SKU数据（只包含Item表中存在的字段）
      // 构建商品名称（潮玩类特殊处理）
      let finalItemName = formData.itemName;
      if (formData.itemType === "潮玩类" && formData.toyVariant !== "正常款") {
        finalItemName = `${formData.itemName} - ${formData.toyVariant}`;
      } else if (formData.itemColor) {
        finalItemName = `${formData.itemName} - ${formData.itemColor}`;
      }

      const skuData = {
        itemId: formData.itemId,
        itemName: finalItemName,
        itemNumber: formData.itemNumber,
        itemType: formData.itemType,
        itemBrand: "", // 可以从商品名称中提取
        itemCondition: formData.itemType === "潮玩类" ? formData.toyCondition : "全新",
        itemColor: formData.itemColor,
        itemSize: "均码", // 默认尺码
        itemRemarks: formData.itemDescription,
        photos: formData.photos,
        
        // 潮玩相关字段
        toyCharacterId: formData.itemType === "潮玩类" ? toyCharacterId : null,
        toyVariant: formData.itemType === "潮玩类" ? formData.toyVariant : null,
        toyCondition: formData.itemType === "潮玩类" ? formData.toyCondition : null,
        
        // 仓库位置信息（如果有选择的话）
        warehousePositionId: warehouseDistribution.find(w => w.quantity > 0)?.warehouseId || null,
        position: null, // 可以后续扩展
        accessories: null, // 可以后续扩展
      };

      // 调用创建SKU API（不创建交易记录）
      const response = await fetch("/api/items/create-sku", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(skuData),
      });

      if (!response.ok) {
        throw new Error("创建商品失败");
      }

      const result = await response.json();
      
      if (result.success) {
        // 显示成功状态
        setIsSuccess(true);
        
        toast({
          title: "🎉 SKU创建成功！",
          description: `商品 ${skuData.itemName} 已成功创建，SKU: ${skuData.itemId}。可在销售管理中创建具体的购买/销售记录。`,
          duration: 5000, // 显示5秒
        });
        
        // 延迟重置表单和状态
        setTimeout(() => {
          // 重置表单
          setFormData({
            itemId: "",
            itemName: "",
            itemNumber: "",
            itemColor: "",
            itemDescription: "",
            itemType: "",
            costPrice: "",
            shippingCost: "100",
            mercariShipping: "180",
            yahooShipping: "170",
            minPrice: "",
            salePrice: "",
            totalStock: "1",
            photos: [],
          });
          
          // 重置仓库分布
          setWarehouseDistribution(prev => prev.map(w => ({ ...w, quantity: 0 })));
          
          // 重置成功状态
          setIsSuccess(false);
          
          onSuccess();
        }, 2000); // 2秒后重置
      } else {
        throw new Error(result.error || "创建商品失败");
      }
    } catch (error) {
      toast({
        title: "创建失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 业务说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="text-2xl">ℹ️</div>
          <div>
            <div className="font-semibold text-blue-800">关于SKU创建</div>
            <div className="text-sm text-blue-600">
              此功能仅创建商品SKU信息，不会生成购买记录。具体的购买/销售交易请在"销售管理"中创建。
            </div>
          </div>
        </div>
      </div>

      {/* 成功提示 */}
      {isSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🎉</div>
            <div>
              <div className="font-semibold text-green-800">SKU创建成功！</div>
              <div className="text-sm text-green-600">
                商品SKU已成功创建，可在销售管理中创建具体的购买/销售记录。表单将在2秒后自动重置。
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* SKU ID */}
      <div className="space-y-2">
        <Label htmlFor="itemId">
          SKU <span className="text-red-500">*</span>
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="itemId"
            value={formData.itemId}
            onChange={(e) => setFormData(prev => ({ ...prev, itemId: e.target.value }))}
            placeholder="自动生成"
            className="font-mono"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const timestamp = Date.now().toString().slice(-6);
              const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
              setFormData(prev => ({ ...prev, itemId: `SKU-${timestamp}-${randomStr}` }));
            }}
          >
            重新生成
          </Button>
        </div>
      </div>

      {/* 商品名称 - 带自动补全 */}
      <div className="space-y-2 relative">
        <Label htmlFor="itemName">
          商品名称 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="itemName"
          value={formData.itemName}
          onChange={(e) => handleNameSearch(e.target.value)}
          onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
          placeholder="输入商品名称，系统会自动联想"
          required
        />
        {showNameSuggestions && nameSuggestions.length > 0 && (
          <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {nameSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                onClick={() => selectNameSuggestion(suggestion)}
              >
                <div className="font-medium">{suggestion.displayText}</div>
                <div className="text-sm text-gray-500">{suggestion.secondaryText}</div>
                <div className="text-xs text-blue-600">已有 {suggestion.count} 件商品</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 货号 - 带自动补全 */}
      <div className="space-y-2 relative">
        <Label htmlFor="itemNumber">货号</Label>
        <Input
          id="itemNumber"
          value={formData.itemNumber}
          onChange={(e) => handleNumberSearch(e.target.value)}
          onBlur={() => setTimeout(() => setShowNumberSuggestions(false), 200)}
          placeholder="输入货号，系统会自动联想商品名称"
        />
        {showNumberSuggestions && numberSuggestions.length > 0 && (
          <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {numberSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                onClick={() => selectNumberSuggestion(suggestion)}
              >
                <div className="font-medium font-mono">{suggestion.displayText}</div>
                <div className="text-sm text-gray-500">{suggestion.secondaryText}</div>
                <div className="text-xs text-blue-600">已有 {suggestion.count} 件商品</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 颜色 */}
      <div className="space-y-2">
        <Label htmlFor="itemColor">颜色 (可选)</Label>
        <Input
          id="itemColor"
          value={formData.itemColor}
          onChange={(e) => setFormData(prev => ({ ...prev, itemColor: e.target.value }))}
          placeholder="如：ディープブルー（大深蓝）"
        />
        <p className="text-xs text-gray-500">
          填写后将显示为"商品名 - 颜色"的格式
        </p>
      </div>

      {/* 商品描述 */}
      <div className="space-y-2">
        <Label htmlFor="itemDescription">商品描述</Label>
        <Textarea
          id="itemDescription"
          value={formData.itemDescription}
          onChange={(e) => setFormData(prev => ({ ...prev, itemDescription: e.target.value }))}
          placeholder="商品的详细描述"
          rows={3}
        />
      </div>

      {/* 商品分类 */}
      <div className="space-y-2">
        <Label>
          商品分类 <span className="text-red-500">*</span>
        </Label>
        <Select
          value={formData.itemType}
          onValueChange={(value) => setFormData(prev => ({ 
            ...prev, 
            itemType: value,
            // 如果不是潮玩类，清空潮玩相关字段
            toyBrandName: value === "潮玩类" ? prev.toyBrandName : "",
            toySeriesName: value === "潮玩类" ? prev.toySeriesName : "",
            toyCharacterName: value === "潮玩类" ? prev.toyCharacterName : "",
          }))}
          required
        >
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

      {/* 潮玩信息表单 - 仅当选择潮玩类时显示 */}
      {formData.itemType === "潮玩类" && (
        <ToyInfoForm
          brandName={formData.toyBrandName}
          seriesName={formData.toySeriesName}
          characterName={formData.toyCharacterName}
          toyVariant={formData.toyVariant}
          toyCondition={formData.toyCondition}
          onBrandNameChange={(value) => setFormData(prev => ({ ...prev, toyBrandName: value }))}
          onSeriesNameChange={(value) => setFormData(prev => ({ ...prev, toySeriesName: value }))}
          onCharacterNameChange={(value) => setFormData(prev => ({ ...prev, toyCharacterName: value }))}
          onToyVariantChange={(value) => setFormData(prev => ({ ...prev, toyVariant: value }))}
          onToyConditionChange={(value) => setFormData(prev => ({ ...prev, toyCondition: value }))}
          onAutoFill={(data) => {
            setFormData(prev => ({
              ...prev,
              itemName: prev.itemName || data.itemName,
              itemNumber: prev.itemNumber || data.itemNumber,
            }));
          }}
        />
      )}

      {/* 价格信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-lg">{EmojiIcons.DollarSign}</span>
            价格设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="costPrice">
                成本价格 (¥) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="costPrice"
                type="number"
                value={formData.costPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, costPrice: e.target.value }))}
                placeholder="2600"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shippingCost">中国到日本运费 (¥)</Label>
              <Input
                id="shippingCost"
                type="number"
                value={formData.shippingCost}
                onChange={(e) => setFormData(prev => ({ ...prev, shippingCost: e.target.value }))}
                placeholder="100"
              />
              <p className="text-xs text-gray-500">默认100元</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mercariShipping">Mercari平台运费 (¥)</Label>
              <Input
                id="mercariShipping"
                type="number"
                value={formData.mercariShipping}
                onChange={(e) => setFormData(prev => ({ ...prev, mercariShipping: e.target.value }))}
                placeholder="180"
              />
              <p className="text-xs text-gray-500">默认180元</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="yahooShipping">ヤフーフリマ平台运费 (¥)</Label>
              <Input
                id="yahooShipping"
                type="number"
                value={formData.yahooShipping}
                onChange={(e) => setFormData(prev => ({ ...prev, yahooShipping: e.target.value }))}
                placeholder="170"
              />
              <p className="text-xs text-gray-500">默认170元</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="minPrice">建议最低售价 (¥)</Label>
              <Input
                id="minPrice"
                type="number"
                value={formData.minPrice}
                readOnly
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">管理员设定的最低售价</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salePrice">销售价格 (¥)</Label>
              <Input
                id="salePrice"
                type="number"
                value={formData.salePrice}
                onChange={(e) => setFormData(prev => ({ ...prev, salePrice: e.target.value }))}
                placeholder="4780"
              />
              <p className="text-xs text-gray-500">实际售价，不能低于建议最低价</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 仓库库存分布 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-lg">{EmojiIcons.Warehouse}</span>
            仓库库存分布 <span className="text-red-500">*</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="totalStock">总库存:</Label>
            <Input
              id="totalStock"
              type="number"
              value={formData.totalStock}
              onChange={(e) => setFormData(prev => ({ ...prev, totalStock: e.target.value }))}
              className="w-20"
              min="1"
            />
            <span className="text-sm text-gray-600">件</span>
          </div>
          
          <p className="text-sm text-gray-600">
            为每个仓库设置库存数量。同一商品可以分布在多个仓库中。
          </p>

          <div className="space-y-3">
            {warehouseDistribution.map((warehouse) => (
              <div key={warehouse.warehouseId} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{warehouse.icon}</span>
                  <div>
                    <div className="font-medium">{warehouse.warehouseName}</div>
                    {warehouse.responsible && (
                      <div className="text-sm text-gray-500">{warehouse.responsible} 负责</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={warehouse.quantity}
                    onChange={(e) => updateWarehouseQuantity(warehouse.warehouseId, parseInt(e.target.value) || 0)}
                    className="w-20 text-center"
                    min="0"
                  />
                  <span className="text-sm text-gray-600">件</span>
                </div>
              </div>
            ))}
          </div>

          {totalDistributedStock !== parseInt(formData.totalStock) && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ 库存分布不匹配：总库存 {formData.totalStock} 件，已分布 {totalDistributedStock} 件
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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
              创建中...
            </>
          ) : isSuccess ? (
            <>
              <span className="text-lg mr-2">✅</span>
              创建成功！
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              创建SKU
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
