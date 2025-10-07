"use client";

import * as React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmojiIcons } from '@/components/emoji-icons';
import { STATUS_CONFIG } from '@/lib/constants';
import { format } from 'date-fns';
import { StockManagement } from '@/components/stock-management';

interface SKUPageProps {
  params: {
    itemNumber: string;
  };
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || {
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: "?",
    description: "未知状态",
  };

  return (
    <Badge variant="outline" className={`${config.color} border`}>
      <span className="mr-1">{config.icon}</span>
      {status}
    </Badge>
  );
}

export default function SKUDetailPage({ params }: SKUPageProps) {
  const [allItems, setAllItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [itemNumber, setItemNumber] = React.useState<string>('');

  // 获取数据
  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const resolvedParams = await params;
      const decodedItemNumber = decodeURIComponent(resolvedParams.itemNumber);
      setItemNumber(decodedItemNumber);
      
      const response = await fetch('/api/items/list?pageSize=10000');
      const data = await response.json();
      setAllItems(data.items || []);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [params]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }
  
  // 筛选出相同货号的所有商品
  const skuItems = allItems.filter(item => item.itemNumber === itemNumber);

  if (skuItems.length === 0) {
    notFound();
  }

  // 使用第一个商品的基本信息作为代表
  const representativeItem = skuItems[0];

  // 按尺码分组统计
  const sizeMap = new Map<string, any>();
  let totalPurchaseValue = 0;
  let totalSoldValue = 0;
  let totalProfit = 0;
  let inStockCount = 0;
  let soldCount = 0;
  let allPhotos: string[] = [];

  skuItems.forEach(item => {
    const transaction = item.transactions?.[0];
    const size = item.itemSize;
    const purchasePrice = parseFloat(transaction?.purchasePrice || "0");
    const soldPrice = transaction?.soldPrice ? parseFloat(transaction.soldPrice) : undefined;
    const isSold = !!transaction?.soldDate;
    
    // 使用结汇时的汇率计算利润（如果已结算）
    let profit = 0;
    if (soldPrice && transaction?.soldPriceExchangeRate) {
      const soldPriceCNY = soldPrice * parseFloat(transaction.soldPriceExchangeRate);
      profit = soldPriceCNY - purchasePrice;
    }

    // 收集所有图片
    if (item.photos && item.photos.length > 0) {
      allPhotos.push(...item.photos);
    }

    // 统计总值
    totalPurchaseValue += purchasePrice;
    if (soldPrice && transaction?.soldPriceExchangeRate) {
      const soldPriceCNY = soldPrice * parseFloat(transaction.soldPriceExchangeRate);
      totalSoldValue += soldPriceCNY; // 使用人民币计算总售价
      totalProfit += profit;
    }

    // 统计数量
    if (isSold) {
      soldCount++;
    } else {
      inStockCount++;
    }

    // 按尺码统计
    if (!sizeMap.has(size)) {
      sizeMap.set(size, {
        size,
        count: 0,
        inStock: 0,
        sold: 0,
        totalPurchasePrice: 0,
        totalSoldPrice: 0,
        items: []
      });
    }

    const sizeData = sizeMap.get(size);
    sizeData.count++;
    sizeData.totalPurchasePrice += purchasePrice;
    
    if (isSold) {
      sizeData.sold++;
      // 使用结汇汇率转换的人民币价格
      if (soldPrice && transaction?.soldPriceExchangeRate) {
        const soldPriceCNY = soldPrice * parseFloat(transaction.soldPriceExchangeRate);
        sizeData.totalSoldPrice += soldPriceCNY;
      }
    } else {
      sizeData.inStock++;
    }

    sizeData.items.push({
      ...item,
      transaction,
      purchasePrice,
      soldPrice,
      profit: soldPrice ? profit : undefined,
    });
  });

  // 计算平均利润率（基于售价）
  const averageProfitRate = totalSoldValue > 0 ? (totalProfit / totalSoldValue) * 100 : 0;

  // 转换尺码数据并排序
  const sizes = Array.from(sizeMap.values()).map(sizeData => ({
    size: sizeData.size,
    count: sizeData.count,
    inStock: sizeData.inStock,
    sold: sizeData.sold,
    avgPurchasePrice: sizeData.count > 0 ? sizeData.totalPurchasePrice / sizeData.count : 0,
    avgSoldPrice: sizeData.sold > 0 ? sizeData.totalSoldPrice / sizeData.sold : 0,
    items: sizeData.items,
  })).sort((a, b) => {
    // 尺码排序：数字尺码按数值排序，字母尺码按字母排序
    const aNum = parseFloat(a.size);
    const bNum = parseFloat(b.size);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum;
    }
    return a.size.localeCompare(b.size);
  });

  return (
    <div className="space-y-6">
      {/* 面包屑导航 */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Link href="/items" className="hover:text-blue-600 transition-colors">
          商品库存
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{representativeItem.itemName}</span>
      </div>

      {/* 页面标题和操作 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {representativeItem.itemName}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>货号: {itemNumber}</span>
            <span>品牌: {representativeItem.itemBrand}</span>
            <span>类型: {representativeItem.itemType}</span>
            <Badge variant="outline" className="bg-blue-100 text-blue-800">
              {skuItems.length}件商品
            </Badge>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/items">
              <span className="text-lg mr-2">{EmojiIcons.ArrowLeft}</span>
              返回列表
            </Link>
          </Button>
        </div>
      </div>

      {/* 总体统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{skuItems.length}</div>
            <div className="text-sm text-gray-600">总商品数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{inStockCount}</div>
            <div className="text-sm text-gray-600">在库数量</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{soldCount}</div>
            <div className="text-sm text-gray-600">已售数量</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {averageProfitRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">平均利润率</div>
          </CardContent>
        </Card>
      </div>

      {/* 财务概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-lg">{EmojiIcons.DollarSign}</span>
            财务概览
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                ¥{totalPurchaseValue.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">总投入成本</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                ¥{totalSoldValue.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">已售收入</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                ¥{totalProfit.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">总利润</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 库存管理 */}
      <StockManagement 
        itemNumber={itemNumber}
        stockItems={skuItems.map(item => ({
          itemId: item.itemId,
          itemSize: item.itemSize,
          currentStatus: item.transaction?.orderStatus || item.transactionStatues || "在途（国内）",
          purchasePrice: parseFloat(item.transaction?.purchasePrice || "0"),
          warehousePosition: item.warehousePosition?.name || undefined,
        }))}
        onStockUpdate={fetchData}
      />

      {/* 各尺码详情 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-lg">{EmojiIcons.Tag}</span>
            各尺码销售情况
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sizes.map((sizeData) => (
              <div key={sizeData.size} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-lg font-semibold">
                      {sizeData.size}码
                    </Badge>
                    <span className="text-sm text-gray-600">
                      共{sizeData.count}件
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span>在库 {sizeData.inStock}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      <span>已售 {sizeData.sold}</span>
                    </div>
                  </div>
                </div>

                {/* 价格统计 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="font-semibold text-green-600">
                      ¥{sizeData.avgPurchasePrice.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-600">平均进价</div>
                  </div>
                  {sizeData.sold > 0 && (
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <div className="font-semibold text-blue-600">
                        ¥{sizeData.avgSoldPrice.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">平均售价</div>
                    </div>
                  )}
                </div>

                {/* 具体商品列表 */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">具体商品:</div>
                  <div className="grid gap-2">
                    {sizeData.items.map((item: any) => (
                      <div key={item.itemId} className="flex items-center justify-between p-3 bg-gray-50 rounded text-sm">
                        <div className="flex items-center gap-3">
                          <Link 
                            href={`/item/${item.itemId}`}
                            className="text-blue-600 hover:underline font-mono"
                          >
                            {item.itemId}
                          </Link>
                          <StatusBadge status={item.transaction?.orderStatus || "在途（国内）"} />
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-green-600">
                            进价: ¥{item.purchasePrice.toLocaleString()}
                          </div>
                          {item.soldPrice && (
                            <>
                              <div className="text-blue-600">
                                售价: ¥{item.soldPrice.toLocaleString()}
                              </div>
                              <div className={`font-semibold ${item.profit && item.profit > 0 ? 'text-purple-600' : 'text-red-600'}`}>
                                利润: ¥{(item.profit || 0).toLocaleString()}
                              </div>
                            </>
                          )}
                          <div className="text-gray-500">
                            {item.transaction?.purchaseDate ? format(new Date(item.transaction.purchaseDate), "yyyy-MM-dd") : ""}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
