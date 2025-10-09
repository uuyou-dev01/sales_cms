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
import { Save, X } from "lucide-react";

interface TransactionFormProps {
  itemId: string;
  itemName: string;
  characterName: string;
  variant: string;
  transactionType: 'purchase' | 'sale';
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TransactionForm({
  itemId,
  itemName,
  characterName,
  variant,
  transactionType,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    // 基本交易信息
    amount: "",
    quantity: transactionType === 'purchase' ? "1" : "1", // 采购/销售数量
    currency: transactionType === 'purchase' ? "CNY" : "JPY",
    exchangeRate: transactionType === 'purchase' ? "1" : "0.05",
    date: new Date().toISOString().split('T')[0],
    platform: transactionType === 'purchase' ? "淘宝" : "Mercari",
    
    // 运费和其他费用
    domesticShipping: "0",
    internationalShipping: "0",
    otherFees: "",
    
    // 物流信息
    trackingNumber: "",
    orderStatus: transactionType === 'purchase' ? "在途（国内）" : "已完成",
    
    // 备注
    remarks: "",
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
      const transactionData = {
        itemId,
        type: transactionType,
        unitPrice: parseFloat(formData.amount),
        quantity: parseInt(formData.quantity) || 1,
        totalAmount: parseFloat(formData.amount) * (parseInt(formData.quantity) || 1),
        currency: formData.currency,
        exchangeRate: parseFloat(formData.exchangeRate),
        date: formData.date,
        platform: formData.platform,
        domesticShipping: parseFloat(formData.domesticShipping) || 0,
        internationalShipping: parseFloat(formData.internationalShipping) || 0,
        otherFees: formData.otherFees,
        trackingNumber: formData.trackingNumber,
        orderStatus: formData.orderStatus,
        remarks: formData.remarks,
      };

      const response = await fetch('/api/transactions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData),
      });

      const result = await response.json();

      if (result.success || response.ok) {
        toast({
          title: `${transactionType === 'purchase' ? '采购' : '销售'}记录创建成功`,
          description: `${characterName} ${variant} 的${transactionType === 'purchase' ? '采购' : '销售'}记录已添加`,
        });
        onSuccess?.();
      } else {
        throw new Error(result.error || "创建失败");
      }
    } catch (error) {
      console.error('创建交易记录失败:', error);
      toast({
        title: "创建失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isPurchase = transactionType === 'purchase';
  const title = isPurchase ? '新增采购记录' : '新增销售记录';
  const icon = isPurchase ? '📦' : '💰';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 商品基本信息 */}
      <Card className={`border-2 ${isPurchase ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'}`}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            {title} - {characterName} {variant}
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

      {/* 交易基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isPurchase ? '采购信息' : '销售信息'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">
                {isPurchase ? '单价' : '单价'} <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder={isPurchase ? "单价" : "单价"}
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
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
              <Label htmlFor="quantity">
                {isPurchase ? '采购数量' : '销售数量'} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                step="1"
                placeholder="数量"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">
                {isPurchase ? '采购日期' : '销售日期'}
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="platform">
                {isPurchase ? '采购平台' : '销售平台'}
              </Label>
              <Select
                value={formData.platform}
                onValueChange={(value) => setFormData(prev => ({ ...prev, platform: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isPurchase ? (
                    <>
                      <SelectItem value="淘宝">淘宝</SelectItem>
                      <SelectItem value="天猫">天猫</SelectItem>
                      <SelectItem value="京东">京东</SelectItem>
                      <SelectItem value="拼多多">拼多多</SelectItem>
                      <SelectItem value="闲鱼">闲鱼</SelectItem>
                      <SelectItem value="微信">微信</SelectItem>
                      <SelectItem value="线下">线下</SelectItem>
                      <SelectItem value="其他">其他</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="Mercari">Mercari</SelectItem>
                      <SelectItem value="ヤフーフリマ">ヤフーフリマ</SelectItem>
                      <SelectItem value="ヤフオク">ヤフオク</SelectItem>
                      <SelectItem value="Amazon">Amazon</SelectItem>
                      <SelectItem value="楽天">楽天</SelectItem>
                      <SelectItem value="微信">微信</SelectItem>
                      <SelectItem value="线下">线下</SelectItem>
                      <SelectItem value="其他">其他</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exchangeRate">汇率</Label>
              <Input
                id="exchangeRate"
                type="number"
                step="0.0001"
                placeholder={isPurchase ? "1" : "0.05"}
                value={formData.exchangeRate}
                onChange={(e) => setFormData(prev => ({ ...prev, exchangeRate: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 费用信息 - 只在采购时显示 */}
      {isPurchase && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">费用信息</CardTitle>
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

            <div className="space-y-2">
              <Label htmlFor="otherFees">其他费用</Label>
              <Input
                id="otherFees"
                placeholder="其他费用说明"
                value={formData.otherFees}
                onChange={(e) => setFormData(prev => ({ ...prev, otherFees: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 状态和备注信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isPurchase ? '物流状态' : '交易状态'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* 快递单号 - 只在采购时显示 */}
            {isPurchase && (
              <div className="space-y-2">
                <Label htmlFor="trackingNumber">快递单号</Label>
                <Input
                  id="trackingNumber"
                  placeholder="快递单号"
                  value={formData.trackingNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, trackingNumber: e.target.value }))}
                />
              </div>
            )}
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
                  {isPurchase ? (
                    <>
                      <SelectItem value="在途（国内）">在途（国内）</SelectItem>
                      <SelectItem value="在途（国际）">在途（国际）</SelectItem>
                      <SelectItem value="在库">在库</SelectItem>
                      <SelectItem value="已上架">已上架</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="交易中">交易中</SelectItem>
                      <SelectItem value="已售出">已售出</SelectItem>
                      <SelectItem value="已完成">已完成</SelectItem>
                      <SelectItem value="已退货">已退货</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">备注</Label>
            <Textarea
              id="remarks"
              placeholder="交易备注信息"
              value={formData.remarks}
              onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* 计算预览 */}
      {formData.amount && parseFloat(formData.amount) > 0 && (
        <Card className="bg-gray-50 border-gray-200">
          <CardHeader>
            <CardTitle className="text-base text-gray-800">金额计算</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const unitPrice = parseFloat(formData.amount) || 0;
              const quantity = parseInt(formData.quantity) || 1;
              const exchangeRate = parseFloat(formData.exchangeRate) || 1;
              const domesticShipping = isPurchase ? parseFloat(formData.domesticShipping) || 0 : 0;
              const internationalShipping = isPurchase ? parseFloat(formData.internationalShipping) || 0 : 0;
              
              const unitPriceCNY = formData.currency === 'CNY' ? unitPrice : unitPrice * exchangeRate;
              const totalAmount = unitPriceCNY * quantity;
              const totalCost = totalAmount + domesticShipping + internationalShipping;

              return (
                <div className={`grid ${isPurchase ? 'grid-cols-4' : 'grid-cols-3'} gap-4 text-sm`}>
                  <div>
                    <span className="text-gray-600">单价(CNY):</span>
                    <div className="font-semibold text-gray-800">¥{unitPriceCNY.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">数量:</span>
                    <div className="font-semibold text-gray-800">{quantity}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">
                      {isPurchase ? '小计金额' : '销售金额'}:
                    </span>
                    <div className="font-semibold text-gray-800">¥{totalAmount.toFixed(2)}</div>
                  </div>
                  {isPurchase && (
                    <div>
                      <span className="text-gray-600">总成本:</span>
                      <div className="font-semibold text-gray-800">¥{totalCost.toFixed(2)}</div>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

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
              创建中...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              创建{isPurchase ? '采购' : '销售'}记录
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
