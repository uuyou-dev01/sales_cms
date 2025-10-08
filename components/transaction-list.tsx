"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmojiIcons } from "@/components/emoji-icons";
import { format } from "date-fns";

interface Transaction {
  id: string;
  type: 'purchase' | 'sale';
  amount: number;
  currency: string;
  exchangeRate: number;
  amountCNY: number;
  date: string;
  platform: string;
  orderStatus: string;
  trackingNumber?: string;
  domesticShipping: number;
  internationalShipping: number;
  otherFees?: string;
  remarks?: string;
  profit?: number;
}

interface TransactionListProps {
  itemId: string;
  itemName: string;
  characterName: string;
  variant: string;
  onClose?: () => void;
}

export function TransactionList({
  itemId,
  itemName,
  characterName,
  variant,
  onClose,
}: TransactionListProps) {
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState({
    totalPurchases: 0,
    totalSales: 0,
    totalPurchaseAmount: 0,
    totalSaleAmount: 0,
    totalProfit: 0,
    avgPurchasePrice: 0,
    avgSalePrice: 0,
    profitRate: 0,
    currentStock: 0,
  });

  React.useEffect(() => {
    fetchTransactions();
  }, [itemId]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/transactions/list?itemId=${itemId}`);
      const data = await response.json();
      
      if (data.success && data.transactions) {
        setTransactions(data.transactions);
        calculateStats(data.transactions);
      } else {
        // 如果API不存在，使用模拟数据
        const mockTransactions: Transaction[] = [
          {
            id: '1',
            type: 'purchase',
            amount: 100,
            currency: 'CNY',
            exchangeRate: 1,
            amountCNY: 100,
            date: '2025-01-01',
            platform: '淘宝',
            orderStatus: '在库',
            domesticShipping: 10,
            internationalShipping: 0,
            remarks: '第一次采购',
          },
          {
            id: '2',
            type: 'sale',
            amount: 2000,
            currency: 'JPY',
            exchangeRate: 0.05,
            amountCNY: 100,
            date: '2025-01-15',
            platform: 'Mercari',
            orderStatus: '已完成',
            domesticShipping: 0,
            internationalShipping: 15,
            profit: -25, // 100 - 100 - 15 - 10 = -25
            remarks: '第一次销售',
          },
        ];
        setTransactions(mockTransactions);
        calculateStats(mockTransactions);
      }
    } catch (error) {
      console.error('获取交易记录失败:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (transactions: Transaction[]) => {
    const purchases = transactions.filter(t => t.type === 'purchase');
    const sales = transactions.filter(t => t.type === 'sale');

    const totalPurchases = purchases.length;
    const totalSales = sales.length;
    
    const totalPurchaseAmount = purchases.reduce((sum, t) => sum + t.amountCNY + t.domesticShipping + t.internationalShipping, 0);
    const totalSaleAmount = sales.reduce((sum, t) => sum + t.amountCNY, 0);
    
    const totalProfit = totalSaleAmount - totalPurchaseAmount;
    const avgPurchasePrice = totalPurchases > 0 ? totalPurchaseAmount / totalPurchases : 0;
    const avgSalePrice = totalSales > 0 ? totalSaleAmount / totalSales : 0;
    const profitRate = totalSaleAmount > 0 ? (totalProfit / totalSaleAmount) * 100 : 0;
    const currentStock = totalPurchases - totalSales;

    setStats({
      totalPurchases,
      totalSales,
      totalPurchaseAmount,
      totalSaleAmount,
      totalProfit,
      avgPurchasePrice,
      avgSalePrice,
      profitRate,
      currentStock,
    });
  };

  const getTransactionIcon = (type: string) => {
    return type === 'purchase' ? '📦' : '💰';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "已完成": return "bg-green-100 text-green-800";
      case "在库": return "bg-blue-100 text-blue-800";
      case "在途（国内）": return "bg-yellow-100 text-yellow-800";
      case "在途（国际）": return "bg-orange-100 text-orange-800";
      case "交易中": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">📊</div>
          <div>加载交易记录中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 商品信息 */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span>🎭</span>
            {characterName} {variant} - 交易记录
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

      {/* 统计信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">交易统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-sm mb-4">
            <div className="text-center">
              <div className="text-gray-600">采购次数</div>
              <div className="font-semibold text-blue-600">{stats.totalPurchases}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-600">销售次数</div>
              <div className="font-semibold text-green-600">{stats.totalSales}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-600">当前库存</div>
              <div className="font-semibold text-gray-600">{stats.currentStock}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-600">利润率</div>
              <div className={`font-semibold ${stats.profitRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.profitRate.toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm pt-4 border-t border-gray-100">
            <div className="text-center">
              <div className="text-gray-600">总采购金额</div>
              <div className="font-semibold text-blue-600">¥{stats.totalPurchaseAmount.toFixed(0)}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-600">总销售金额</div>
              <div className="font-semibold text-green-600">¥{stats.totalSaleAmount.toFixed(0)}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-600">总利润</div>
              <div className={`font-semibold ${stats.totalProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                ¥{stats.totalProfit.toFixed(0)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 交易记录列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>交易记录 ({transactions.length})</span>
            <Button variant="outline" size="sm" onClick={onClose}>
              <span className="mr-1">{EmojiIcons.Close}</span>
              关闭
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📝</div>
              <div>暂无交易记录</div>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <Card key={transaction.id} className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getTransactionIcon(transaction.type)}</span>
                        <Badge 
                          variant={transaction.type === 'purchase' ? 'secondary' : 'default'}
                          className="text-sm"
                        >
                          {transaction.type === 'purchase' ? '采购' : '销售'}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {format(new Date(transaction.date), 'yyyy-MM-dd')}
                        </span>
                      </div>
                      <Badge className={getStatusColor(transaction.orderStatus)}>
                        {transaction.orderStatus}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">金额</div>
                        <div className="font-semibold">
                          {transaction.amount} {transaction.currency}
                          {transaction.currency !== 'CNY' && (
                            <span className="text-gray-500 ml-1">
                              (¥{transaction.amountCNY.toFixed(0)})
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">平台</div>
                        <div className="font-semibold">{transaction.platform}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">运费</div>
                        <div className="font-semibold">
                          ¥{(transaction.domesticShipping + transaction.internationalShipping).toFixed(0)}
                        </div>
                      </div>
                    </div>

                    {transaction.trackingNumber && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-600">快递单号:</span>
                        <span className="ml-2 font-mono">{transaction.trackingNumber}</span>
                      </div>
                    )}

                    {transaction.remarks && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-600">备注:</span>
                        <span className="ml-2">{transaction.remarks}</span>
                      </div>
                    )}

                    {transaction.profit !== undefined && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="text-sm">
                          <span className="text-gray-600">利润:</span>
                          <span className={`ml-2 font-semibold ${transaction.profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ¥{transaction.profit.toFixed(0)}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
