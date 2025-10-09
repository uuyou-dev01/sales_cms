"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SafeDialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/safe-dialog";
import { DialogTrigger } from "@/components/ui/dialog";
import { Calculator, TrendingUp } from "lucide-react";

export function PriceCalculator() {
  const [open, setOpen] = React.useState(false);
  const [calculationMode, setCalculationMode] = React.useState<'forward' | 'reverse'>('forward');
  const [formData, setFormData] = React.useState({
    purchasePrice: "",
    currency: "CNY",
    exchangeRate: "0.05", // CNY to JPY default rate
    targetProfitRate: "30", // 默认30%利润率
    platformFeeRate: "10", // 平台手续费率，默认10%
    japanShipping: "520", // 日本平台邮费，默认520日元
    // 反向计算字段
    targetSalePrice: "", // 目标售价
    targetProfitRateReverse: "30", // 目标利润率（反向）
  });

  // 正向计算：根据成本计算售价
  const calculateEstimatedPrice = () => {
    const purchasePrice = parseFloat(formData.purchasePrice) || 0;
    const exchangeRate = parseFloat(formData.exchangeRate) || 1;
    const targetProfitRate = parseFloat(formData.targetProfitRate) || 0;
    const platformFeeRate = parseFloat(formData.platformFeeRate) || 0;
    const japanShipping = parseFloat(formData.japanShipping) || 0;

    if (purchasePrice <= 0) return 0;

    // 将购入价格转换为日元（如果不是日元的话）
    const purchasePriceJPY = formData.currency === "JPY" ? purchasePrice : purchasePrice / exchangeRate;
    
    // 总成本 = 购入价格 + 日本邮费
    const totalCost = purchasePriceJPY + japanShipping;
    
    // 考虑平台手续费和目标利润率的售价计算
    // 售价 = 总成本 / (1 - 平台手续费率 - 目标利润率)
    const combinedRate = (platformFeeRate + targetProfitRate) / 100;
    const estimatedPrice = totalCost / (1 - combinedRate);
    
    return estimatedPrice;
  };

  // 反向计算：根据目标售价和利润率计算最高收货价
  const calculateMaxPurchasePrice = () => {
    const targetSalePrice = parseFloat(formData.targetSalePrice) || 0;
    const targetProfitRate = parseFloat(formData.targetProfitRateReverse) || 0;
    const platformFeeRate = parseFloat(formData.platformFeeRate) || 0;
    const japanShipping = parseFloat(formData.japanShipping) || 0;
    const exchangeRate = parseFloat(formData.exchangeRate) || 1;

    if (targetSalePrice <= 0) return { maxPurchasePriceJPY: 0, maxPurchasePriceCNY: 0 };

    // 反推公式：
    // 售价 = (成本 + 日本邮费) / (1 - 平台手续费率 - 目标利润率)
    // => 成本 + 日本邮费 = 售价 * (1 - 平台手续费率 - 目标利润率)
    // => 成本 = 售价 * (1 - 平台手续费率 - 目标利润率) - 日本邮费
    
    const combinedRate = (platformFeeRate + targetProfitRate) / 100;
    const maxCost = targetSalePrice * (1 - combinedRate);
    const maxPurchasePriceJPY = maxCost - japanShipping;
    
    // 转换为人民币
    const maxPurchasePriceCNY = maxPurchasePriceJPY * exchangeRate;
    
    return { 
      maxPurchasePriceJPY: Math.max(0, maxPurchasePriceJPY),
      maxPurchasePriceCNY: Math.max(0, maxPurchasePriceCNY)
    };
  };

  const estimatedPrice = calculateEstimatedPrice();
  const purchasePriceJPY = formData.currency === "JPY" 
    ? parseFloat(formData.purchasePrice) || 0 
    : (parseFloat(formData.purchasePrice) || 0) / (parseFloat(formData.exchangeRate) || 1);
  const japanShipping = parseFloat(formData.japanShipping) || 0;
  const totalCost = purchasePriceJPY + japanShipping;
  const platformFee = estimatedPrice * (parseFloat(formData.platformFeeRate) || 0) / 100;
  const profit = estimatedPrice - totalCost - platformFee;

  return (
    <SafeDialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-xs"
          title="价格计算器"
        >
          <Calculator className="w-4 h-4 text-blue-600" />
          <span>价格计算器</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            价格计算器
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
        {/* 计算模式切换 */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
          <Button
            type="button"
            variant={calculationMode === 'forward' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1"
            onClick={() => setCalculationMode('forward')}
          >
            成本 → 售价
          </Button>
          <Button
            type="button"
            variant={calculationMode === 'reverse' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1"
            onClick={() => setCalculationMode('reverse')}
          >
            售价 → 成本
          </Button>
        </div>

        {calculationMode === 'forward' ? (
          /* 正向计算模式 */
          <>
        {/* 购入价格 */}
        <div className="space-y-2">
          <Label htmlFor="purchasePrice" className="text-sm">购入价格</Label>
          <div className="flex gap-2">
            <Input
              id="purchasePrice"
              type="number"
              step="0.01"
              placeholder="0"
              value={formData.purchasePrice}
              onChange={(e) => setFormData(prev => ({ ...prev, purchasePrice: e.target.value }))}
              className="flex-1"
            />
            <Select
              value={formData.currency}
              onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                currency: value,
                exchangeRate: value === "CNY" ? "0.05" : value === "USD" ? "0.007" : "1"
              }))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CNY">人民币</SelectItem>
                <SelectItem value="JPY">日元</SelectItem>
                <SelectItem value="USD">美元</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 汇率（如果不是日元） */}
        {formData.currency !== "JPY" && (
          <div className="space-y-2">
            <Label htmlFor="exchangeRate" className="text-sm">
              汇率 ({formData.currency} → JPY)
            </Label>
            <Input
              id="exchangeRate"
              type="number"
              step="0.001"
              placeholder="0.05"
              value={formData.exchangeRate}
              onChange={(e) => setFormData(prev => ({ ...prev, exchangeRate: e.target.value }))}
              className="w-full"
            />
          </div>
        )}

        {/* 费率和费用设置 - 两行布局 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 目标利润率 */}
          <div className="space-y-2">
            <Label htmlFor="targetProfitRate" className="text-sm">目标利润率 (%)</Label>
            <Input
              id="targetProfitRate"
              type="number"
              step="1"
              placeholder="30"
              value={formData.targetProfitRate}
              onChange={(e) => setFormData(prev => ({ ...prev, targetProfitRate: e.target.value }))}
              className="w-full"
            />
          </div>

          {/* 平台手续费 */}
          <div className="space-y-2">
            <Label htmlFor="platformFeeRate" className="text-sm">平台手续费 (%)</Label>
            <Input
              id="platformFeeRate"
              type="number"
              step="0.1"
              placeholder="10"
              value={formData.platformFeeRate}
              onChange={(e) => setFormData(prev => ({ ...prev, platformFeeRate: e.target.value }))}
              className="w-full"
            />
          </div>
        </div>

        {/* 日本平台邮费 */}
        <div className="space-y-2">
          <Label htmlFor="japanShipping" className="text-sm">日本平台邮费 (日元)</Label>
          <Input
            id="japanShipping"
            type="number"
            step="1"
            placeholder="520"
            value={formData.japanShipping}
            onChange={(e) => setFormData(prev => ({ ...prev, japanShipping: e.target.value }))}
            className="w-full"
          />
        </div>

        {/* 计算结果 */}
        {formData.purchasePrice && parseFloat(formData.purchasePrice) > 0 && (
          <div className="pt-3 border-t border-gray-200 space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <TrendingUp className="w-3 h-3" />
              <span>预估结果</span>
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {/* 购入成本（日元） */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600">购入成本:</span>
                <span className="font-medium">{purchasePriceJPY.toFixed(0)} 日元</span>
              </div>

              {/* 日本邮费 */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600">日本邮费:</span>
                <span className="font-medium">{japanShipping.toFixed(0)} 日元</span>
              </div>

              {/* 总成本 */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600">总成本:</span>
                <span className="font-semibold text-orange-600">{totalCost.toFixed(0)} 日元</span>
              </div>

              {/* 预估售价 */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600">预估售价:</span>
                <span className="font-semibold text-green-600">{estimatedPrice.toFixed(0)} 日元</span>
              </div>

              {/* 平台手续费 */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600">平台手续费:</span>
                <span className="font-medium text-red-600">{platformFee.toFixed(0)} 日元</span>
              </div>

              {/* 预估利润 */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600">预估利润:</span>
                <span className={`font-semibold ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {profit.toFixed(0)} 日元
                </span>
              </div>

              {/* 实际利润率 - 跨两列 */}
              <div className="col-span-2 flex justify-center items-center pt-1 border-t border-gray-100">
                <span className="text-gray-600 mr-2">实际利润率:</span>
                <span className={`font-bold text-base ${profit > 0 ? 'text-purple-600' : 'text-red-600'}`}>
                  {estimatedPrice > 0 ? ((profit / estimatedPrice) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>

            {/* 价格建议 */}
            <div className="bg-blue-50 p-3 rounded text-sm">
              <div className="text-blue-800 font-medium mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                定价建议
              </div>
              <div className="text-blue-700 space-y-3">
                {/* 保守定价 */}
                <div className="border-l-2 border-blue-300 pl-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">保守:</span>
                    <span className="font-semibold">{(estimatedPrice * 0.9).toFixed(0)} 日元</span>
                  </div>
                  <div className="text-xs text-blue-600 space-y-0.5">
                    <div className="flex justify-between">
                      <span>净收入:</span>
                      <span>{((estimatedPrice * 0.9) - totalCost - (estimatedPrice * 0.9) * (parseFloat(formData.platformFeeRate) || 0) / 100).toFixed(0)} 日元</span>
                    </div>
                    <div className="flex justify-between">
                      <span>利润率:</span>
                      <span>{(((estimatedPrice * 0.9) - totalCost - (estimatedPrice * 0.9) * (parseFloat(formData.platformFeeRate) || 0) / 100) / (estimatedPrice * 0.9) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* 标准定价 */}
                <div className="border-l-2 border-green-400 pl-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">标准:</span>
                    <span className="font-semibold">{estimatedPrice.toFixed(0)} 日元</span>
                  </div>
                  <div className="text-xs text-blue-600 space-y-0.5">
                    <div className="flex justify-between">
                      <span>净收入:</span>
                      <span>{(profit).toFixed(0)} 日元</span>
                    </div>
                    <div className="flex justify-between">
                      <span>利润率:</span>
                      <span>{estimatedPrice > 0 ? ((profit / estimatedPrice) * 100).toFixed(1) : 0}%</span>
                    </div>
                  </div>
                </div>

                {/* 积极定价 */}
                <div className="border-l-2 border-purple-400 pl-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">积极:</span>
                    <span className="font-semibold">{(estimatedPrice * 1.1).toFixed(0)} 日元</span>
                  </div>
                  <div className="text-xs text-blue-600 space-y-0.5">
                    <div className="flex justify-between">
                      <span>净收入:</span>
                      <span>{((estimatedPrice * 1.1) - totalCost - (estimatedPrice * 1.1) * (parseFloat(formData.platformFeeRate) || 0) / 100).toFixed(0)} 日元</span>
                    </div>
                    <div className="flex justify-between">
                      <span>利润率:</span>
                      <span>{(((estimatedPrice * 1.1) - totalCost - (estimatedPrice * 1.1) * (parseFloat(formData.platformFeeRate) || 0) / 100) / (estimatedPrice * 1.1) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </>
        ) : (
          /* 反向计算模式 */
          <>
        {/* 目标售价 */}
        <div className="space-y-2">
          <Label htmlFor="targetSalePrice" className="text-sm">目标售价 (日元)</Label>
          <Input
            id="targetSalePrice"
            type="number"
            step="1"
            placeholder="5000"
            value={formData.targetSalePrice}
            onChange={(e) => setFormData(prev => ({ ...prev, targetSalePrice: e.target.value }))}
            className="w-full"
          />
        </div>

        {/* 目标利润率和汇率 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="targetProfitRateReverse" className="text-sm">目标利润率 (%)</Label>
            <Input
              id="targetProfitRateReverse"
              type="number"
              step="1"
              placeholder="30"
              value={formData.targetProfitRateReverse}
              onChange={(e) => setFormData(prev => ({ ...prev, targetProfitRateReverse: e.target.value }))}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exchangeRateReverse" className="text-sm">汇率 (日元→人民币)</Label>
            <Input
              id="exchangeRateReverse"
              type="number"
              step="0.0001"
              placeholder="0.05"
              value={formData.exchangeRate}
              onChange={(e) => setFormData(prev => ({ ...prev, exchangeRate: e.target.value }))}
              className="w-full"
            />
          </div>
        </div>

        {/* 费用设置 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="platformFeeRateReverse" className="text-sm">平台手续费 (%)</Label>
            <Input
              id="platformFeeRateReverse"
              type="number"
              step="0.1"
              placeholder="10"
              value={formData.platformFeeRate}
              onChange={(e) => setFormData(prev => ({ ...prev, platformFeeRate: e.target.value }))}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="japanShippingReverse" className="text-sm">日本邮费 (日元)</Label>
            <Input
              id="japanShippingReverse"
              type="number"
              step="1"
              placeholder="520"
              value={formData.japanShipping}
              onChange={(e) => setFormData(prev => ({ ...prev, japanShipping: e.target.value }))}
              className="w-full"
            />
          </div>
        </div>

        {/* 反向计算结果 */}
        {formData.targetSalePrice && parseFloat(formData.targetSalePrice) > 0 && (
          <div className="pt-3 border-t border-gray-200 space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <TrendingUp className="w-3 h-3" />
              <span>收货价格建议</span>
            </div>
            
            {(() => {
              const { maxPurchasePriceJPY, maxPurchasePriceCNY } = calculateMaxPurchasePrice();
              const targetSalePrice = parseFloat(formData.targetSalePrice) || 0;
              const platformFee = targetSalePrice * (parseFloat(formData.platformFeeRate) || 0) / 100;
              const japanShipping = parseFloat(formData.japanShipping) || 0;
              
              return (
                <>
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">最高收货价 (日元):</span>
                          <span className="text-xl font-bold text-green-600">
                            ¥{maxPurchasePriceJPY.toFixed(0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">最高收货价 (人民币):</span>
                          <span className="text-xl font-bold text-green-600">
                            ¥{maxPurchasePriceCNY.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">目标售价:</span>
                      <span className="font-medium">{targetSalePrice.toFixed(0)} 日元</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">平台手续费:</span>
                      <span className="font-medium text-red-600">{platformFee.toFixed(0)} 日元</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">日本邮费:</span>
                      <span className="font-medium">{japanShipping.toFixed(0)} 日元</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">目标利润率:</span>
                      <span className="font-semibold text-purple-600">
                        {formData.targetProfitRateReverse}%
                      </span>
                    </div>
                  </div>

                  <div className="bg-orange-50 p-3 rounded text-xs text-orange-800">
                    <div className="font-medium mb-1">💡 使用说明</div>
                    <div>以 <span className="font-bold">¥{maxPurchasePriceCNY.toFixed(2)}</span> 或更低的价格收货，按 <span className="font-bold">{targetSalePrice.toFixed(0)} 日元</span> 出售，可实现 <span className="font-bold">{formData.targetProfitRateReverse}%</span> 的目标利润率。</div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
        </>
        )}
        </div>
      </DialogContent>
    </SafeDialog>
  );
}
