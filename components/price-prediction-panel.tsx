"use client";

import * as React from "react";
import { EmojiIcons } from "@/components/emoji-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, TrendingUp, History } from "lucide-react";
import { PROFIT_RATE_OPTIONS, LISTING_PLATFORM_OPTIONS, CURRENCY_OPTIONS } from "@/lib/constants";

interface PricePredictionPanelProps {
  purchasePrice: string;
  domesticShipping: string;
  internationalShipping: string;
  itemNumber: string;
  onPredictionChange?: (prediction: PredictionData | null) => void;
}

interface PredictionData {
  costBreakdown: {
    purchasePrice: number;
    domesticShipping: number;
    internationalShipping: number;
    totalCost: number;
    japanShippingFee: number;
    platformFeeRate: number;
    totalCostWithFees: number;
  };
  pricing: {
    suggestedPriceCNY: number;
    suggestedPriceJPY: number;
    profitRate: number;
    targetPlatform: string;
    profitAmount: number;
    profitMargin: number;
  };
  similarSales: {
    totalSales: number;
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    recentSales: Array<{
      price: string;
      date: string;
      platform: string;
      itemName: string;
      size: string;
      condition: string;
    }>;
  } | null;
}

export function PricePredictionPanel({
  purchasePrice,
  domesticShipping,
  internationalShipping,
  itemNumber,
  onPredictionChange,
}: PricePredictionPanelProps) {
  const [prediction, setPrediction] = React.useState<PredictionData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [profitRate, setProfitRate] = React.useState(0.30);
  const [targetPlatform, setTargetPlatform] = React.useState("煤炉");
  const [suggestedPriceCurrency, setSuggestedPriceCurrency] = React.useState("JPY");
  const [suggestedPriceExchangeRate, setSuggestedPriceExchangeRate] = React.useState(0.05);

  const calculatePrediction = async () => {
    if (!purchasePrice || parseFloat(purchasePrice) <= 0) return;

    setLoading(true);
    try {
      const response = await fetch("/api/items/price-prediction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchasePrice,
          domesticShipping,
          internationalShipping,
          profitRate,
          itemNumber,
          targetPlatform,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPrediction(data);
        onPredictionChange?.(data);
      }
    } catch (error) {
      console.error("价格预测失败:", error);
    } finally {
      setLoading(false);
    }
  };

  // 自动触发计算
  React.useEffect(() => {
    if (purchasePrice && parseFloat(purchasePrice) > 0) {
      calculatePrediction();
    }
  }, [purchasePrice, domesticShipping, internationalShipping, profitRate, targetPlatform, itemNumber, suggestedPriceCurrency, suggestedPriceExchangeRate]);

  if (!prediction) {
    return (
      <Card className="border-dashed border-2 border-gray-200">
        <CardContent className="p-6 text-center">
          <span className="text-lg">{EmojiIcons.Calculator}</span>
          <p className="text-sm text-gray-500">填写购入价格后自动显示价格预测</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 价格预测模块 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <span className="text-lg">{EmojiIcons.TrendingUp}</span>
            价格预测
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 参数设置 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">利润率</label>
              <Select value={profitRate.toString()} onValueChange={(value) => setProfitRate(parseFloat(value))}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROFIT_RATE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">目标平台</label>
              <Select value={targetPlatform} onValueChange={setTargetPlatform}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LISTING_PLATFORM_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 建议售价货币设置 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">建议售价货币</label>
              <Select value={suggestedPriceCurrency} onValueChange={setSuggestedPriceCurrency}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">汇率</label>
              <input
                type="number"
                step="0.01"
                value={suggestedPriceExchangeRate}
                onChange={(e) => setSuggestedPriceExchangeRate(parseFloat(e.target.value) || 0.05)}
                className="w-full h-8 px-3 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.05"
              />
            </div>
          </div>

          {/* 成本分析（详细版） */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-xs text-gray-600 mb-2">成本分析</div>
            <div className="space-y-2 text-xs">
              {/* 基础成本 */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-500">购入价格:</span>
                  <span className="ml-1">¥{prediction.costBreakdown.purchasePrice.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-500">国内运费:</span>
                  <span className="ml-1">¥{prediction.costBreakdown.domesticShipping.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-500">国际运费:</span>
                  <span className="ml-1">¥{prediction.costBreakdown.internationalShipping.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-500">基础成本小计:</span>
                  <span className="ml-1 font-medium">¥{prediction.costBreakdown.totalCost.toFixed(2)}</span>
                </div>
              </div>
              
              {/* 日本相关费用 */}
              <div className="border-t pt-2">
                <div className="text-gray-500 mb-1">日本相关费用:</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500">日本邮费:</span>
                    <span className="ml-1">¥{prediction.costBreakdown.japanShippingFee.toFixed(2)} (800日元 × 0.05汇率)</span>
                  </div>
                  <div>
                    <span className="text-gray-500">平台费用率:</span>
                    <span className="ml-1">{prediction.costBreakdown.platformFeeRate.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              
              {/* 总成本计算过程 */}
              <div className="border-t pt-2">
                <div className="text-gray-500 mb-1">总成本计算过程:</div>
                <div className="bg-white p-2 rounded text-xs">
                  <div>基础成本 = ¥{prediction.costBreakdown.purchasePrice.toFixed(2)} + ¥{prediction.costBreakdown.domesticShipping.toFixed(2)} + ¥{prediction.costBreakdown.internationalShipping.toFixed(2)} = ¥{prediction.costBreakdown.totalCost.toFixed(2)}</div>
                  <div>日本邮费 = 800日元 × 0.05汇率 = ¥{prediction.costBreakdown.japanShippingFee.toFixed(2)}</div>
                  <div className="font-medium text-gray-800 mt-1">
                    总成本 = ¥{prediction.costBreakdown.totalCost.toFixed(2)} + ¥{prediction.costBreakdown.japanShippingFee.toFixed(2)} = ¥{prediction.costBreakdown.totalCostWithFees.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 预测结果 */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {(() => {
                  let suggestedPriceInCurrency;
                  if (suggestedPriceCurrency === "JPY") {
                    suggestedPriceInCurrency = prediction.pricing.suggestedPriceJPY ;
                  } else {
                    // 对于其他货币，使用人民币价格除以汇率
                    suggestedPriceInCurrency = prediction.pricing.suggestedPriceCNY / suggestedPriceExchangeRate;
                  }
                  const currencySymbol = CURRENCY_OPTIONS.find(opt => opt.value === suggestedPriceCurrency)?.symbol || "¥";
                  return `${currencySymbol}${suggestedPriceInCurrency.toFixed(2)}`;
                })()}
              </div>
              <div className="text-sm text-gray-600">预计利润：${prediction.pricing.profitAmount.toFixed(2)} （RMB）</div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
            </div>
          </div>
          
        </CardContent>
      </Card>

      {/* 同款销售记录 */}
      {prediction.similarSales && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <History className="w-4 h-4" />
              同款销售记录 ({prediction.similarSales.totalSales}笔)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-medium">¥{prediction.similarSales.averagePrice.toFixed(0)}</div>
                <div className="text-gray-500">平均价格</div>
              </div>
              <div className="text-center">
                <div className="font-medium">¥{prediction.similarSales.minPrice}</div>
                <div className="text-gray-500">最低价格</div>
              </div>
              <div className="text-center">
                <div className="font-medium">¥{prediction.similarSales.maxPrice}</div>
                <div className="text-gray-500">最高价格</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-600">最近销售记录:</div>
              {prediction.similarSales.recentSales.map((sale, index) => (
                <div key={index} className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded">
                  <div>
                    <div className="font-medium">¥{sale.price}</div>
                    <div className="text-gray-500">{sale.platform} • {sale.size}</div>
                  </div>
                  <div className="text-right text-gray-500">
                    <div>{new Date(sale.date).toLocaleDateString()}</div>
                    <div>{sale.condition}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">计算中...</p>
        </div>
      )}
    </div>
  );
} 