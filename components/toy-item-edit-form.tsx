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
import { Badge } from "@/components/ui/badge";

interface ToyItemEditFormProps {
  itemId: string;
  itemName: string;
  characterName: string;
  variant: string;
  condition: string;
  purchasePrice: number;
  soldPrice?: number;
  orderStatus: string;
  purchaseDate: string;
  soldDate?: string;
  profit?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ToyItemEditForm({
  itemId,
  itemName,
  characterName,
  variant,
  condition,
  purchasePrice,
  soldPrice,
  orderStatus,
  purchaseDate,
  soldDate,
  profit,
  onSuccess,
  onCancel,
}: ToyItemEditFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    // 基本信息
    itemCondition: condition,
    itemColor: "",
    itemRemarks: "",
    
    // 交易信息
    purchasePrice: purchasePrice.toString(),
    purchasePriceCurrency: "CNY",
    purchasePriceExchangeRate: "1",
    purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString().split('T')[0] : "",
    purchasePlatform: "淘宝",
    orderStatus: orderStatus,
    
    // 运费信息
    domesticShipping: "0",
    internationalShipping: "0",
    domesticTrackingNumber: "",
    internationalTrackingNumber: "",
    
    // 销售信息
    soldPrice: soldPrice?.toString() || "",
    soldPriceCurrency: "JPY",
    soldPriceExchangeRate: "0.05",
    soldDate: soldDate ? new Date(soldDate).toISOString().split('T')[0] : "",
    soldPlatform: "",
    
    // 其他费用
    otherFees: [] as Array<{name: string, amount: number, currency: string}>,
    
    // 仓库信息
    warehousePositionId: "",
    
    // 上架平台
    listingPlatforms: [] as string[],
  });

  // 获取商品详细信息
  React.useEffect(() => {
    const fetchItemDetails = async () => {
      try {
        const response = await fetch(`/api/items/list?search=${itemId}`);
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
          const item = data.items[0];
          const transaction = item.transactions?.[0];
          
          setFormData(prev => ({
            ...prev,
            itemCondition: item.itemCondition || condition,
            itemColor: item.itemColor || "",
            itemRemarks: item.itemRemarks || "",
            
            purchasePrice: transaction?.purchasePrice || purchasePrice.toString(),
            purchasePriceCurrency: transaction?.purchasePriceCurrency || "CNY",
            purchasePriceExchangeRate: transaction?.purchasePriceExchangeRate || "1",
            purchaseDate: transaction?.purchaseDate ? new Date(transaction.purchaseDate).toISOString().split('T')[0] : "",
            purchasePlatform: transaction?.purchasePlatform || "淘宝",
            orderStatus: transaction?.orderStatus || orderStatus,
            
            domesticShipping: transaction?.domesticShipping || "0",
            internationalShipping: transaction?.internationalShipping || "0",
            domesticTrackingNumber: transaction?.domesticTrackingNumber || "",
            internationalTrackingNumber: transaction?.internationalTrackingNumber || "",
            
            soldPrice: transaction?.soldPrice || "",
            soldPriceCurrency: transaction?.soldPriceCurrency || "JPY",
            soldPriceExchangeRate: transaction?.soldPriceExchangeRate || "0.05",
            soldDate: transaction?.soldDate ? new Date(transaction.soldDate).toISOString().split('T')[0] : "",
            soldPlatform: transaction?.soldPlatform || "",
            
            otherFees: transaction?.otherFees || [],
            warehousePositionId: item.warehousePositionId || "",
            listingPlatforms: transaction?.listingPlatforms || [],
          }));
        }
      } catch (error) {
        console.error('获取商品详情失败:', error);
      }
    };

    fetchItemDetails();
  }, [itemId, condition, purchasePrice, orderStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.purchasePrice || parseFloat(formData.purchasePrice) <= 0) {
      toast({
        title: "请填写有效的购买价格",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // 更新商品信息
      const updateData = {
        itemCondition: formData.itemCondition,
        itemColor: formData.itemColor,
        itemRemarks: formData.itemRemarks,
        warehousePositionId: formData.warehousePositionId || null,
        
        // 交易信息
        purchasePrice: formData.purchasePrice,
        purchasePriceCurrency: formData.purchasePriceCurrency,
        purchasePriceExchangeRate: formData.purchasePriceExchangeRate,
        purchaseDate: formData.purchaseDate,
        purchasePlatform: formData.purchasePlatform,
        orderStatus: formData.orderStatus,
        
        domesticShipping: formData.domesticShipping,
        internationalShipping: formData.internationalShipping,
        domesticTrackingNumber: formData.domesticTrackingNumber,
        internationalTrackingNumber: formData.internationalTrackingNumber,
        
        soldPrice: formData.soldPrice || "0",
        soldPriceCurrency: formData.soldPriceCurrency,
        soldPriceExchangeRate: formData.soldPriceExchangeRate,
        soldDate: formData.soldDate || null,
        soldPlatform: formData.soldPlatform,
        
        otherFees: formData.otherFees,
        listingPlatforms: formData.listingPlatforms,
      };

      const response = await fetch(`/api/items/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, ...updateData }),
      });

      const result = await response.json();

      if (result.success || response.ok) {
        toast({
          title: "更新成功",
          description: `${characterName} ${variant} 的信息已更新`,
        });
        onSuccess?.();
      } else {
        throw new Error(result.error || "更新失败");
      }
    } catch (error) {
      console.error('更新商品失败:', error);
      toast({
        title: "更新失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "已售出": return "text-green-600";
      case "在库": return "text-blue-600";
      case "在途（国内）": return "text-yellow-600";
      case "在途（国际）": return "text-orange-600";
      default: return "text-gray-600";
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 商品基本信息 */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span>🎭</span>
            编辑 {characterName} - {variant}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">商品ID:</span>
              <span className="ml-2 font-mono">{itemId}</span>
            </div>
            <div>
              <span className="text-gray-600">商品名称:</span>
              <span className="ml-2">{itemName}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 商品状态信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">商品状态</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>商品成色</Label>
              <Select
                value={formData.itemCondition}
                onValueChange={(value) => setFormData(prev => ({ ...prev, itemCondition: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="未拆盒">未拆盒</SelectItem>
                  <SelectItem value="已拆盒">已拆盒</SelectItem>
                  <SelectItem value="无盒">无盒</SelectItem>
                  <SelectItem value="盒损">盒损</SelectItem>
                  <SelectItem value="全新">全新</SelectItem>
                  <SelectItem value="99新">99新</SelectItem>
                  <SelectItem value="9新">9新</SelectItem>
                  <SelectItem value="8新">8新</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>订单状态</Label>
              <Select
                value={formData.orderStatus}
                onValueChange={(value) => setFormData(prev => ({ ...prev, orderStatus: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="在途（国内）">在途（国内）</SelectItem>
                  <SelectItem value="在途（国际）">在途（国际）</SelectItem>
                  <SelectItem value="在库">在库</SelectItem>
                  <SelectItem value="已上架">已上架</SelectItem>
                  <SelectItem value="交易中">交易中</SelectItem>
                  <SelectItem value="已售出">已售出</SelectItem>
                  <SelectItem value="已完成">已完成</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="itemColor">颜色</Label>
              <Input
                id="itemColor"
                placeholder="商品颜色"
                value={formData.itemColor}
                onChange={(e) => setFormData(prev => ({ ...prev, itemColor: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemRemarks">备注</Label>
              <Input
                id="itemRemarks"
                placeholder="商品备注"
                value={formData.itemRemarks}
                onChange={(e) => setFormData(prev => ({ ...prev, itemRemarks: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 购买信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">购买信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">购买价格 <span className="text-red-500">*</span></Label>
              <div className="flex gap-2">
                <Input
                  id="purchasePrice"
                  type="number"
                  step="0.01"
                  placeholder="购买价格"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, purchasePrice: e.target.value }))}
                  required
                />
                <Select
                  value={formData.purchasePriceCurrency}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, purchasePriceCurrency: value }))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CNY">¥</SelectItem>
                    <SelectItem value="JPY">¥</SelectItem>
                    <SelectItem value="USD">$</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchaseDate">购买日期</Label>
              <Input
                id="purchaseDate"
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchasePlatform">购买平台</Label>
              <Select
                value={formData.purchasePlatform}
                onValueChange={(value) => setFormData(prev => ({ ...prev, purchasePlatform: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="淘宝">淘宝</SelectItem>
                  <SelectItem value="天猫">天猫</SelectItem>
                  <SelectItem value="京东">京东</SelectItem>
                  <SelectItem value="拼多多">拼多多</SelectItem>
                  <SelectItem value="闲鱼">闲鱼</SelectItem>
                  <SelectItem value="微信">微信</SelectItem>
                  <SelectItem value="线下">线下</SelectItem>
                  <SelectItem value="其他">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchasePriceExchangeRate">汇率</Label>
              <Input
                id="purchasePriceExchangeRate"
                type="number"
                step="0.0001"
                placeholder="1"
                value={formData.purchasePriceExchangeRate}
                onChange={(e) => setFormData(prev => ({ ...prev, purchasePriceExchangeRate: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 运费信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">运费信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="domesticShipping">国内运费 (¥)</Label>
              <Input
                id="domesticShipping"
                type="number"
                step="0.01"
                placeholder="0"
                value={formData.domesticShipping}
                onChange={(e) => setFormData(prev => ({ ...prev, domesticShipping: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="internationalShipping">国际运费 (¥)</Label>
              <Input
                id="internationalShipping"
                type="number"
                step="0.01"
                placeholder="0"
                value={formData.internationalShipping}
                onChange={(e) => setFormData(prev => ({ ...prev, internationalShipping: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="domesticTrackingNumber">国内快递单号</Label>
              <Input
                id="domesticTrackingNumber"
                placeholder="国内快递单号"
                value={formData.domesticTrackingNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, domesticTrackingNumber: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="internationalTrackingNumber">国际快递单号</Label>
              <Input
                id="internationalTrackingNumber"
                placeholder="国际快递单号"
                value={formData.internationalTrackingNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, internationalTrackingNumber: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 销售信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">销售信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="soldPrice">销售价格</Label>
              <div className="flex gap-2">
                <Input
                  id="soldPrice"
                  type="number"
                  step="0.01"
                  placeholder="销售价格"
                  value={formData.soldPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, soldPrice: e.target.value }))}
                />
                <Select
                  value={formData.soldPriceCurrency}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, soldPriceCurrency: value }))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JPY">¥</SelectItem>
                    <SelectItem value="CNY">¥</SelectItem>
                    <SelectItem value="USD">$</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="soldDate">销售日期</Label>
              <Input
                id="soldDate"
                type="date"
                value={formData.soldDate}
                onChange={(e) => setFormData(prev => ({ ...prev, soldDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="soldPlatform">销售平台</Label>
              <Select
                value={formData.soldPlatform}
                onValueChange={(value) => setFormData(prev => ({ ...prev, soldPlatform: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择销售平台" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mercari">Mercari</SelectItem>
                  <SelectItem value="ヤフーフリマ">ヤフーフリマ</SelectItem>
                  <SelectItem value="ヤフオク">ヤフオク</SelectItem>
                  <SelectItem value="Amazon">Amazon</SelectItem>
                  <SelectItem value="楽天">楽天</SelectItem>
                  <SelectItem value="微信">微信</SelectItem>
                  <SelectItem value="线下">线下</SelectItem>
                  <SelectItem value="其他">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="soldPriceExchangeRate">结汇汇率</Label>
              <Input
                id="soldPriceExchangeRate"
                type="number"
                step="0.0001"
                placeholder="0.05"
                value={formData.soldPriceExchangeRate}
                onChange={(e) => setFormData(prev => ({ ...prev, soldPriceExchangeRate: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 利润信息显示 */}
      {formData.soldPrice && parseFloat(formData.soldPrice) > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-base text-green-800">利润计算</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const purchasePrice = parseFloat(formData.purchasePrice) || 0;
              const soldPrice = parseFloat(formData.soldPrice) || 0;
              const soldPriceExchangeRate = parseFloat(formData.soldPriceExchangeRate) || 0.05;
              const soldPriceCNY = soldPrice * soldPriceExchangeRate;
              const profit = soldPriceCNY - purchasePrice;
              const profitRate = soldPriceCNY > 0 ? (profit / soldPriceCNY) * 100 : 0;

              return (
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">售价(CNY):</span>
                    <div className="font-semibold text-green-800">¥{soldPriceCNY.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">利润:</span>
                    <div className={`font-semibold ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ¥{profit.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">利润率:</span>
                    <div className={`font-semibold ${profitRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {profitRate.toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* 提交按钮 */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={loading} className="min-w-24">
          {loading ? (
            <>
              <span className="animate-spin mr-2">{EmojiIcons.RefreshCw}</span>
              更新中...
            </>
          ) : (
            <>
              <span className="mr-2">{EmojiIcons.Save}</span>
              保存更新
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
