"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmojiIcons } from "@/components/emoji-icons";
import Link from "next/link";
import { format } from "date-fns";

interface ToySeriesCardProps {
  seriesId: string;
  seriesName: string;
  brandName: string;
  seriesImage?: string;
  description?: string;
  totalItems: number;
  inStockCount: number;
  soldCount: number;
  totalPurchaseValue: number;
  totalSoldValue: number;
  totalProfit: number;
  averageProfitRate: number;
  characters: Array<{
    characterName: string;
    variant: string;
    count: number;
    inStock: number;
    sold: number;
  }>;
  latestPurchaseDate: string;
  oldestPurchaseDate: string;
}

export function ToySeriesCard({
  seriesId,
  seriesName,
  brandName,
  seriesImage,
  description,
  totalItems,
  inStockCount,
  soldCount,
  totalPurchaseValue,
  totalSoldValue,
  totalProfit,
  averageProfitRate,
  characters,
  latestPurchaseDate,
  oldestPurchaseDate,
}: ToySeriesCardProps) {
  // 计算存储天数
  const storageDays = oldestPurchaseDate 
    ? Math.floor((new Date().getTime() - new Date(oldestPurchaseDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // 获取利润率颜色
  const getProfitColor = (rate: number) => {
    if (rate > 30) return "text-green-600";
    if (rate > 15) return "text-blue-600";
    if (rate > 0) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Link href={`/toys/series/${seriesId}`}>
      <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-orange-200 bg-gradient-to-br from-orange-50 to-pink-50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                {brandName} {seriesName}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  🧸 潮玩系列
                </Badge>
                <span className="text-sm text-gray-600">{totalItems}件</span>
              </div>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-orange-200 to-pink-200 rounded-lg flex items-center justify-center">
              {seriesImage ? (
                <img src={seriesImage} alt={seriesName} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <span className="text-2xl">🎭</span>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* 品牌和描述 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">品牌:</span>
              <span className="font-medium text-gray-900">{brandName}</span>
            </div>
            {description && (
              <div className="text-xs text-gray-500 line-clamp-2">{description}</div>
            )}
          </div>

          {/* 款式统计 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">可选款式:</span>
              <div className="flex flex-wrap gap-1">
                {characters.slice(0, 3).map((char, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {char.characterName}
                    {char.variant !== "正常款" && ` (${char.variant})`}
                    <span className="ml-1 text-blue-600">({char.count})</span>
                  </Badge>
                ))}
                {characters.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{characters.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* 投入和库存 */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600">总投入:</div>
              <div className="font-semibold text-gray-900">¥{totalPurchaseValue.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-600">库存状态:</div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">在库 {inStockCount}</span>
                <span className="text-blue-600">已售 {soldCount}</span>
              </div>
            </div>
          </div>

          {/* 利润信息 */}
          {totalProfit > 0 && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-600">总利润:</div>
                <div className={`font-semibold ${getProfitColor(averageProfitRate)}`}>
                  ¥{totalProfit.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-gray-600">利润率:</div>
                <div className={`font-semibold ${getProfitColor(averageProfitRate)}`}>
                  {averageProfitRate.toFixed(1)}%
                </div>
              </div>
            </div>
          )}

          {/* 存储时间 */}
          {storageDays > 0 && (
            <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1 text-gray-600">
                <span>{EmojiIcons.Clock}</span>
                <span>存储时间</span>
              </div>
              <span className="font-medium text-gray-900">{storageDays}天</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
