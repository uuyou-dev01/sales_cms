"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmojiIcons } from "@/components/emoji-icons";
import { format } from "date-fns";
import { Edit, Trash2, X } from "lucide-react";
import { SafeDialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/safe-dialog";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);
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
      const response = await fetch(`/api/sales/transactions?itemId=${itemId}`);
      const json = await response.json();
      const list = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
      const mapped: Transaction[] = list.map((tx: any) => {
        const isSale = !!(tx.soldPrice || tx.soldDate || tx.soldPlatform);
        const amount = isSale ? parseFloat(tx.soldPrice || '0') : parseFloat(tx.purchasePrice || '0');
        const currency = isSale ? (tx.soldPriceCurrency || 'CNY') : (tx.purchasePriceCurrency || 'CNY');
        const rate = isSale ? parseFloat(tx.soldPriceExchangeRate || '1') : parseFloat(tx.purchasePriceExchangeRate || '1');
        const date = isSale ? (tx.soldDate || tx.createdAt) : (tx.purchaseDate || tx.createdAt);
        const platform = isSale ? (tx.soldPlatform || '') : (tx.purchasePlatform || '');
        const profit = tx.itemNetProfit ? parseFloat(tx.itemNetProfit) : (tx.itemGrossProfit ? parseFloat(tx.itemGrossProfit) : undefined);
        return {
          id: tx.id,
          type: isSale ? 'sale' : 'purchase',
          amount: isNaN(amount) ? 0 : amount,
          currency,
          exchangeRate: isNaN(rate) ? 1 : rate,
          amountCNY: (isNaN(amount) || isNaN(rate)) ? 0 : amount * rate,
          date,
          platform,
          orderStatus: tx.orderStatus || '在库',
          trackingNumber: tx.domesticTrackingNumber || tx.internationalTrackingNumber || undefined,
          domesticShipping: parseFloat(tx.domesticShipping || '0') || 0,
          internationalShipping: parseFloat(tx.internationalShipping || '0') || 0,
          otherFees: Array.isArray(tx.otherFees) ? JSON.stringify(tx.otherFees) : (tx.otherFees ? String(tx.otherFees) : undefined),
          remarks: undefined,
          profit,
        } as Transaction;
      });
      setTransactions(mapped);
      calculateStats(mapped);
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

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditDialogOpen(true);
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm("确定要删除这条交易记录吗？")) {
      return;
    }

    try {
      const response = await fetch(`/api/sales/transactions/${transactionId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "删除成功",
          description: "交易记录已删除",
        });
        fetchTransactions(); // 刷新数据
      } else {
        throw new Error("删除失败");
      }
    } catch (error) {
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "删除交易记录失败",
        variant: "destructive",
      });
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
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(transaction.orderStatus)}>
                          {transaction.orderStatus}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => handleEditTransaction(transaction)}
                          title="编辑交易记录"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          title="删除交易记录"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
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

      {/* 编辑交易记录对话框 */}
      <SafeDialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" />
              编辑{editingTransaction?.type === 'purchase' ? '采购' : '销售'}记录
            </DialogTitle>
          </DialogHeader>
          {editingTransaction && (
            <TransactionEditForm
              transaction={editingTransaction}
              itemId={itemId}
              itemName={itemName}
              characterName={characterName}
              variant={variant}
              onSuccess={() => {
                setEditDialogOpen(false);
                setEditingTransaction(null);
                fetchTransactions(); // 刷新数据
                toast({
                  title: "更新成功",
                  description: "交易记录已更新",
                });
              }}
              onCancel={() => {
                setEditDialogOpen(false);
                setEditingTransaction(null);
              }}
            />
          )}
        </DialogContent>
      </SafeDialog>
    </div>
  );
}

// 交易记录编辑表单组件
interface TransactionEditFormProps {
  transaction: Transaction;
  itemId: string;
  itemName: string;
  characterName: string;
  variant: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

function TransactionEditForm({
  transaction,
  itemId,
  itemName,
  characterName,
  variant,
  onSuccess,
  onCancel,
}: TransactionEditFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    amount: transaction.amount.toString(),
    currency: transaction.currency,
    exchangeRate: transaction.exchangeRate.toString(),
    date: transaction.date,
    platform: transaction.platform,
    orderStatus: transaction.orderStatus,
    trackingNumber: transaction.trackingNumber || "",
    domesticShipping: transaction.domesticShipping.toString(),
    internationalShipping: transaction.internationalShipping.toString(),
    otherFees: transaction.otherFees || "",
    remarks: transaction.remarks || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: "请填写有效的金额",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const isPurchase = transaction.type === 'purchase';
      const payload: any = {
        orderStatus: formData.orderStatus,
        domesticTrackingNumber: formData.trackingNumber || null,
        domesticShipping: String(parseFloat(formData.domesticShipping) || 0),
        internationalShipping: String(parseFloat(formData.internationalShipping) || 0),
        otherFees: formData.otherFees || undefined,
        remarks: formData.remarks || undefined,
      };
      if (isPurchase) {
        payload.purchasePrice = String(parseFloat(formData.amount));
        payload.purchasePriceCurrency = formData.currency;
        payload.purchasePriceExchangeRate = String(parseFloat(formData.exchangeRate) || 1);
        payload.purchaseDate = formData.date;
        payload.purchasePlatform = formData.platform;
      } else {
        payload.soldPrice = String(parseFloat(formData.amount));
        payload.soldPriceCurrency = formData.currency;
        payload.soldPriceExchangeRate = String(parseFloat(formData.exchangeRate) || 1);
        payload.soldDate = formData.date;
        payload.soldPlatform = formData.platform;
      }

      const response = await fetch(`/api/sales/transactions/${transaction.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        onSuccess?.();
      } else {
        throw new Error("更新失败");
      }
    } catch (error) {
      toast({
        title: "更新失败",
        description: error instanceof Error ? error.message : "更新交易记录失败",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isPurchase = transaction.type === 'purchase';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">金额</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">货币</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.currency}
                onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
              >
                <option value="CNY">人民币</option>
                <option value="JPY">日元</option>
                <option value="USD">美元</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">汇率</label>
              <input
                type="number"
                step="0.0001"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.exchangeRate}
                onChange={(e) => setFormData(prev => ({ ...prev, exchangeRate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">日期</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">平台</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.platform}
                onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">状态</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.orderStatus}
                onChange={(e) => setFormData(prev => ({ ...prev, orderStatus: e.target.value }))}
              >
                {isPurchase ? (
                  <>
                    <option value="在途（国内）">在途（国内）</option>
                    <option value="在途（国际）">在途（国际）</option>
                    <option value="在库">在库</option>
                    <option value="已上架">已上架</option>
                  </>
                ) : (
                  <>
                    <option value="交易中">交易中</option>
                    <option value="已售出">已售出</option>
                    <option value="已完成">已完成</option>
                    <option value="已退货">已退货</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 运费信息 - 只在采购时显示 */}
      {isPurchase && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">运费信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">国内运费</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.domesticShipping}
                  onChange={(e) => setFormData(prev => ({ ...prev, domesticShipping: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">国际运费</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.internationalShipping}
                  onChange={(e) => setFormData(prev => ({ ...prev, internationalShipping: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">快递单号</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.trackingNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, trackingNumber: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 备注 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">备注</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={3}
            value={formData.remarks}
            onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
            placeholder="输入备注信息..."
          />
        </CardContent>
      </Card>

      {/* 提交按钮 */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
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
              <Edit className="w-4 h-4 mr-2" />
              更新记录
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
