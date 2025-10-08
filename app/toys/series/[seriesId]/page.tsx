"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { EmojiIcons } from "@/components/emoji-icons";
import Link from "next/link";
import { format } from "date-fns";
import { SafeDialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/safe-dialog";
import { SeriesSKUForm } from "@/components/series-sku-form";
import { TransactionForm } from "@/components/transaction-form";
import { TransactionList } from "@/components/transaction-list";
import { StockAdjustment } from "@/components/stock-adjustment";

interface ToySeriesItem {
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
}

interface ToySeriesDetail {
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
    items: ToySeriesItem[];
  }>;
}

export default function ToySeriesDetailPage({ params }: { params: { seriesId: string } }) {
  const { toast } = useToast();
  const [seriesData, setSeriesData] = React.useState<ToySeriesDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [addSkuDialogOpen, setAddSkuDialogOpen] = React.useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = React.useState(false);
  const [transactionListDialogOpen, setTransactionListDialogOpen] = React.useState(false);
  const [stockAdjustmentDialogOpen, setStockAdjustmentDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<ToySeriesItem | null>(null);
  const [transactionType, setTransactionType] = React.useState<'purchase' | 'sale'>('purchase');

  React.useEffect(() => {
    fetchSeriesDetail();
  }, [params.seriesId]);

  const fetchSeriesDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/toys/series/${params.seriesId}`);
      const data = await response.json();
      
      if (data.success) {
        setSeriesData(data.data);
      } else {
        throw new Error(data.error || '获取系列详情失败');
      }
    } catch (error) {
      console.error('获取系列详情失败:', error);
      toast({
        title: "获取数据失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getProfitColor = (rate: number) => {
    if (rate > 30) return "text-green-600";
    if (rate > 15) return "text-blue-600";
    if (rate > 0) return "text-yellow-600";
    return "text-red-600";
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

  // 统计每个款式的状态数量
  const getCharacterStats = (items: ToySeriesItem[]) => {
    const stats = {
      inStock: 0,      // 在库
      inTransit: 0,    // 在途
      sold: 0,         // 已售
      total: 0         // 总计
    };

    items.forEach(item => {
      stats.total++;
      if (item.soldDate) {
        stats.sold++;
      } else if (item.orderStatus.includes("在途")) {
        stats.inTransit++;
      } else {
        stats.inStock++;
      }
    });

    return stats;
  };

  // 计算商品统计信息
  const calculateItemStats = (item: ToySeriesItem) => {
    // 这里需要根据实际的交易记录来计算
    // 暂时使用模拟数据，实际应该从API获取该商品的所有交易记录
    const mockTransactions = [
      { type: 'purchase', amount: item.purchasePrice, date: '2025-01-01' },
      ...(item.soldPrice ? [{ type: 'sale', amount: item.soldPrice, date: '2025-01-15' }] : [])
    ];

    const purchases = mockTransactions.filter(t => t.type === 'purchase');
    const sales = mockTransactions.filter(t => t.type === 'sale');

    const purchaseCount = purchases.length;
    const saleCount = sales.length;
    
    const totalPurchaseAmount = purchases.reduce((sum, t) => sum + t.amount, 0);
    const totalSaleAmount = sales.reduce((sum, t) => sum + t.amount, 0);
    
    const avgPurchasePrice = purchaseCount > 0 ? totalPurchaseAmount / purchaseCount : 0;
    const avgSalePrice = saleCount > 0 ? totalSaleAmount / saleCount : 0;
    
    const totalProfit = totalSaleAmount - totalPurchaseAmount;
    const avgProfitRate = totalSaleAmount > 0 ? (totalProfit / totalSaleAmount) * 100 : 0;
    
    const currentStock = purchaseCount - saleCount;

    return {
      purchaseCount,
      saleCount,
      avgPurchasePrice,
      avgSalePrice,
      totalProfit,
      avgProfitRate,
      currentStock,
      recentTransactions: mockTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };
  };

  // 新增采购
  const handleAddPurchase = (item: ToySeriesItem) => {
    setEditingItem(item);
    setTransactionType('purchase');
    setTransactionDialogOpen(true);
  };

  // 新增销售
  const handleAddSale = (item: ToySeriesItem) => {
    setEditingItem(item);
    setTransactionType('sale');
    setTransactionDialogOpen(true);
  };

  // 查看交易详情
  const handleViewTransactions = (item: ToySeriesItem) => {
    setEditingItem(item);
    setTransactionListDialogOpen(true);
  };

  // 库存调整
  const handleStockAdjustment = (item: ToySeriesItem) => {
    setEditingItem(item);
    setStockAdjustmentDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-4">🎭</div>
            <div>加载系列详情中...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!seriesData) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-4xl mb-4">😕</div>
          <h2 className="text-xl font-semibold mb-2">系列不存在</h2>
          <p className="text-gray-600 mb-4">请检查链接是否正确</p>
          <Link href="/items">
            <Button>返回商品列表</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 系列头部信息 */}
      <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-pink-50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                {seriesData.brandName} {seriesData.seriesName}
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <Badge className="bg-orange-100 text-orange-800">🧸 潮玩系列</Badge>
                <span>总计 {seriesData.totalItems} 件</span>
                <span>在库 {seriesData.inStockCount} 件</span>
                <span>已售 {seriesData.soldCount} 件</span>
              </div>
              {seriesData.description && (
                <p className="text-gray-700 mt-2">{seriesData.description}</p>
              )}
            </div>
            <div className="w-20 h-20 bg-gradient-to-br from-orange-200 to-pink-200 rounded-lg flex items-center justify-center">
              {seriesData.seriesImage ? (
                <img src={seriesData.seriesImage} alt={seriesData.seriesName} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <span className="text-3xl">🎭</span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">¥{seriesData.totalPurchaseValue.toLocaleString()}</div>
              <div className="text-sm text-gray-600">总投入</div>
            </div>
            {seriesData.totalSoldValue > 0 && (
              <>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">¥{seriesData.totalSoldValue.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">总销售额</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getProfitColor(seriesData.averageProfitRate)}`}>
                    ¥{seriesData.totalProfit.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">总利润</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getProfitColor(seriesData.averageProfitRate)}`}>
                    {seriesData.averageProfitRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">平均利润率</div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/items">
            <Button variant="outline">
              <span>{EmojiIcons.ArrowLeft}</span>
              返回列表
            </Button>
          </Link>
          <Button onClick={() => setAddSkuDialogOpen(true)}>
            <span>{EmojiIcons.Plus}</span>
            添加新款式
          </Button>
        </div>
      </div>

      {/* 角色和款式列表 */}
      <div className="space-y-4">
        {seriesData.characters.map((character, index) => {
          const stats = getCharacterStats(character.items);
          return (
            <Card key={index} className="border-l-4 border-l-orange-400">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>🎭</span>
                    <span>{character.characterName}</span>
                    {character.variant !== "正常款" && (
                      <Badge variant="secondary">{character.variant}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600">总计 {stats.total} 件</span>
                    <span className="text-blue-600">在库 {stats.inStock}</span>
                    <span className="text-yellow-600">在途 {stats.inTransit}</span>
                    <span className="text-green-600">已售 {stats.sold}</span>
                  </div>
                </CardTitle>
              </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {character.items.map((item) => {
                  // 计算该商品的统计信息
                  const itemStats = calculateItemStats(item);
                  
                  return (
                    <Card key={item.itemId} className="border border-gray-200 bg-white">
                      <CardContent className="p-4">
                        {/* 商品基本信息 */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Link href={`/items/${item.itemId}`} className="text-blue-600 hover:underline font-mono font-semibold">
                              {item.itemId}
                            </Link>
                            <Badge variant="outline" className="text-xs">
                              {item.condition}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddPurchase(item)}
                              className="h-7 px-2 text-xs"
                            >
                              <span className="mr-1">📦</span>
                              新增采购
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddSale(item)}
                              className="h-7 px-2 text-xs"
                            >
                              <span className="mr-1">💰</span>
                              新增销售
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStockAdjustment(item)}
                              className="h-7 px-2 text-xs"
                            >
                              <span className="mr-1">📊</span>
                              调整库存
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewTransactions(item)}
                              className="h-7 px-2 text-xs"
                            >
                              <span className="mr-1">{EmojiIcons.Eye}</span>
                              详情
                            </Button>
                          </div>
                        </div>

                        {/* 统计信息 */}
                        <div className="grid grid-cols-5 gap-4 text-sm">
                          <div className="text-center">
                            <div className="text-gray-600">采购次数</div>
                            <div className="font-semibold text-blue-600">{itemStats.purchaseCount}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-600">销售次数</div>
                            <div className="font-semibold text-green-600">{itemStats.saleCount}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-600">平均进价</div>
                            <div className="font-semibold text-blue-600">
                              ¥{itemStats.avgPurchasePrice.toFixed(0)}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-600">平均售价</div>
                            <div className="font-semibold text-green-600">
                              ¥{itemStats.avgSalePrice.toFixed(0)}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-600">平均利润率</div>
                            <div className={`font-semibold ${itemStats.avgProfitRate > 0 ? 'text-purple-600' : 'text-red-600'}`}>
                              {itemStats.avgProfitRate.toFixed(1)}%
                            </div>
                          </div>
                        </div>

                        {/* 利润信息 */}
                        {itemStats.totalProfit !== 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div className="text-center">
                                <div className="text-gray-600">总利润</div>
                                <div className={`font-semibold ${itemStats.totalProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  ¥{itemStats.totalProfit.toFixed(0)}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-gray-600">平均利润率</div>
                                <div className={`font-semibold ${itemStats.avgProfitRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {itemStats.avgProfitRate.toFixed(1)}%
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-gray-600">库存状态</div>
                                <div className="font-semibold text-gray-600">
                                  {itemStats.currentStock}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 最近交易记录预览 */}
                        {itemStats.recentTransactions.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="text-xs text-gray-600 mb-2">最近交易</div>
                            <div className="space-y-1">
                              {itemStats.recentTransactions.slice(0, 2).map((transaction, index) => (
                                <div key={index} className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <Badge 
                                      variant={transaction.type === 'purchase' ? 'secondary' : 'default'}
                                      className="text-xs"
                                    >
                                      {transaction.type === 'purchase' ? '采购' : '销售'}
                                    </Badge>
                                    <span className="text-gray-600">
                                      {transaction.date}
                                    </span>
                                  </div>
                                  <div className={`font-medium ${transaction.type === 'purchase' ? 'text-blue-600' : 'text-green-600'}`}>
                                    ¥{transaction.amount.toFixed(0)}
                                  </div>
                                </div>
                              ))}
                              {itemStats.recentTransactions.length > 2 && (
                                <div className="text-xs text-gray-500 text-center">
                                  还有 {itemStats.recentTransactions.length - 2} 条记录...
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>

      {/* 添加SKU对话框 */}
      <SafeDialog open={addSkuDialogOpen} onOpenChange={setAddSkuDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>为 {seriesData.seriesName} 添加新款式</DialogTitle>
          </DialogHeader>
          <SeriesSKUForm
            seriesId={seriesData.seriesId}
            seriesName={seriesData.seriesName}
            brandName={seriesData.brandName}
            onSuccess={() => {
              setAddSkuDialogOpen(false);
              fetchSeriesDetail(); // 刷新数据
              toast({
                title: "添加成功",
                description: "新款式已成功添加到系列中",
              });
            }}
          />
        </DialogContent>
      </SafeDialog>

      {/* 交易表单对话框 */}
      <SafeDialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {transactionType === 'purchase' ? '新增采购记录' : '新增销售记录'} - {editingItem?.characterName} {editingItem?.variant}
            </DialogTitle>
          </DialogHeader>
          {editingItem && (
            <TransactionForm
              itemId={editingItem.itemId}
              itemName={editingItem.itemName}
              characterName={editingItem.characterName}
              variant={editingItem.variant}
              transactionType={transactionType}
              onSuccess={() => {
                setTransactionDialogOpen(false);
                setEditingItem(null);
                fetchSeriesDetail(); // 刷新数据
                toast({
                  title: `${transactionType === 'purchase' ? '采购' : '销售'}记录创建成功`,
                  description: "交易记录已成功添加",
                });
              }}
              onCancel={() => {
                setTransactionDialogOpen(false);
                setEditingItem(null);
              }}
            />
          )}
        </DialogContent>
      </SafeDialog>

        {/* 交易记录列表对话框 */}
        <SafeDialog open={transactionListDialogOpen} onOpenChange={setTransactionListDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                交易记录详情 - {editingItem?.characterName} {editingItem?.variant}
              </DialogTitle>
            </DialogHeader>
            {editingItem && (
              <TransactionList
                itemId={editingItem.itemId}
                itemName={editingItem.itemName}
                characterName={editingItem.characterName}
                variant={editingItem.variant}
                onClose={() => {
                  setTransactionListDialogOpen(false);
                  setEditingItem(null);
                }}
              />
            )}
          </DialogContent>
        </SafeDialog>

        {/* 库存调整对话框 */}
        <SafeDialog open={stockAdjustmentDialogOpen} onOpenChange={setStockAdjustmentDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                库存调整 - {editingItem?.characterName} {editingItem?.variant}
              </DialogTitle>
            </DialogHeader>
            {editingItem && (
              <StockAdjustment
                itemId={editingItem.itemId}
                itemName={editingItem.itemName}
                characterName={editingItem.characterName}
                variant={editingItem.variant}
                currentStock={calculateItemStats(editingItem).currentStock}
                onSuccess={() => {
                  setStockAdjustmentDialogOpen(false);
                  setEditingItem(null);
                  fetchSeriesDetail(); // 刷新数据
                  toast({
                    title: "库存调整成功",
                    description: "库存数量已更新",
                  });
                }}
                onCancel={() => {
                  setStockAdjustmentDialogOpen(false);
                  setEditingItem(null);
                }}
              />
            )}
          </DialogContent>
        </SafeDialog>
    </div>
  );
}
