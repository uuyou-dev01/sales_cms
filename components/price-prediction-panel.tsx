"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, TrendingUp, History, DollarSign } from "lucide-react";
import { PROFIT_RATE_OPTIONS, LISTING_PLATFORM_OPTIONS } from "@/lib/constants";

interface PricePredictionPanelProps {
  purchasePrice: string;
  domesticShipping: string;
  internationalShipping: string;
  itemNumber: string;
  onPredictionChange?: (prediction: any) => void;
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
    suggestedPrice: number;
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

  React.useEffect(() => {
    if (purchasePrice && parseFloat(purchasePrice) > 0) {
      calculatePrediction();
    }
  }, [purchasePrice, domesticShipping, internationalShipping, profitRate, targetPlatform, itemNumber]);

  if (!prediction) {
    return (
      <Card className="border-dashed border-2 border-gray-200">
        <CardContent className="p-6 text-center">
          <Calculator className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500">填写购入价格后显示价格预测</p>
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
            <TrendingUp className="w-4 h-4" />
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

          {/* 成本分析（简化版） */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-xs text-gray-600 mb-2">成本分析</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-gray-500">购入价格:</span>
                <span className="ml-1">¥{prediction.costBreakdown.purchasePrice}</span>
              </div>
              <div>
                <span className="text-gray-500">运费:</span>
                <span className="ml-1">¥{prediction.costBreakdown.domesticShipping + prediction.costBreakdown.internationalShipping}</span>
              </div>
              <div>
                <span className="text-gray-500">总成本:</span>
                <span className="ml-1 font-medium">¥{prediction.costBreakdown.totalCostWithFees.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* 预测结果 */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                ¥{prediction.pricing.suggestedPrice}
              </div>
              <div className="text-sm text-gray-600">建议售价</div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="flex justify-between">
                <span>预计利润:</span>
                <span className="text-green-600">¥{prediction.pricing.profitAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>利润率:</span>
                <span className="text-green-600">{prediction.pricing.profitMargin.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>平台费用:</span>
                <span className="text-red-600">{prediction.costBreakdown.platformFeeRate}%</span>
              </div>
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