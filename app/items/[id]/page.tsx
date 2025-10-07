import { getCachedItems } from '@/lib/cache';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmojiIcons } from '@/components/emoji-icons';
import { STATUS_CONFIG } from '@/lib/constants';
import { format } from 'date-fns';

interface ItemPageProps {
  params: {
    id: string;
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

export default async function ItemDetailPage({ params }: ItemPageProps) {
  const items = await getCachedItems();
  const id = await params.id;
  const item = items.find(item => item.itemId === id);

  if (!item) {
    notFound();
  }

  const transaction = item.transactions?.[0];
  const daysInStock = transaction?.purchaseDate 
    ? Math.floor((Date.now() - new Date(transaction.purchaseDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // 计算利润率（使用结汇汇率）
  const profitRate = transaction?.purchasePrice && transaction?.soldPrice && transaction?.soldPriceExchangeRate
    ? (() => {
        const purchasePrice = parseFloat(transaction.purchasePrice);
        const soldPrice = parseFloat(transaction.soldPrice);
        const exchangeRate = parseFloat(transaction.soldPriceExchangeRate);
        const soldPriceCNY = soldPrice * exchangeRate;
        const profit = soldPriceCNY - purchasePrice;
        return ((profit / soldPriceCNY) * 100).toFixed(2); // 利润率 = 利润 / 售价
      })()
    : null;

  return (
    <div className="space-y-6">
      {/* 面包屑导航 */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Link href="/items" className="hover:text-blue-600 transition-colors">
          商品库存
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{item.itemName}</span>
      </div>

      {/* 页面标题和操作 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {item.itemName}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>商品ID: {item.itemId}</span>
            <span>货号: {item.itemNumber || "未设置"}</span>
            <StatusBadge status={transaction?.orderStatus || "在途（国内）"} />
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href={`/sales?edit=${item.itemId}`}>
              <span className="text-lg mr-2">{EmojiIcons.Edit}</span>
              编辑商品
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/items">
              <span className="text-lg mr-2">{EmojiIcons.ArrowLeft}</span>
              返回列表
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：商品基本信息 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本信息卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-lg">{EmojiIcons.Package}</span>
                基本信息
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">商品类型:</span>
                    <span className="text-gray-900">{item.itemType || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">品牌:</span>
                    <span className="text-gray-900">{item.itemBrand || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">货号:</span>
                    <span className="text-gray-900 font-mono">{item.itemNumber || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">尺寸:</span>
                    <span className="text-gray-900">{item.itemSize || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">颜色:</span>
                    <span className="text-gray-900">{item.itemColor || 'N/A'}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">成色:</span>
                    <span className="text-gray-900">{item.itemCondition || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">生产日期:</span>
                    <span className="text-gray-900">{item.itemMfgDate || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">仓库位置:</span>
                    <span className="text-gray-900">{item.position || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">配件:</span>
                    <span className="text-gray-900">{item.accessories || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">在库时长:</span>
                    <span className="text-gray-900">{daysInStock}天</span>
                  </div>
                </div>
              </div>
              
              {item.itemRemarks && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-gray-600">备注:</span>
                    <div className="text-gray-900 text-right max-w-md">
                      {item.itemRemarks}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 交易信息卡片 */}
          {transaction && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-lg">{EmojiIcons.DollarSign}</span>
                  交易信息
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">购入价格:</span>
                      <span className="text-green-600 font-semibold">
                        ¥{parseFloat(transaction.purchasePrice || "0").toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">购入日期:</span>
                      <span className="text-gray-900">
                        {transaction.purchaseDate ? format(new Date(transaction.purchaseDate), "yyyy-MM-dd") : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">购入平台:</span>
                      <span className="text-gray-900">{transaction.purchasePlatform || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">交易状态:</span>
                      <StatusBadge status={transaction.orderStatus || "在途（国内）"} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    {transaction.soldPrice && (
                      <>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">售出价格:</span>
                          <span className="text-blue-600 font-semibold">
                            ¥{parseFloat(transaction.soldPrice).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">售出日期:</span>
                          <span className="text-gray-900">
                            {transaction.soldDate ? format(new Date(transaction.soldDate), "yyyy-MM-dd") : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">售出平台:</span>
                          <span className="text-gray-900">{transaction.soldPlatform || 'N/A'}</span>
                        </div>
                        {profitRate && (
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-600">利润率:</span>
                            <span className={`font-semibold ${parseFloat(profitRate) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {profitRate}%
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 物流信息 */}
          {transaction && (transaction.domesticTrackingNumber || transaction.internationalTrackingNumber) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-lg">{EmojiIcons.Truck}</span>
                  物流信息
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {transaction.domesticTrackingNumber && (
                    <div className="space-y-2">
                      <span className="font-medium text-gray-600">国内物流:</span>
                      <div className="text-gray-900 font-mono text-sm bg-gray-50 p-2 rounded">
                        {transaction.domesticTrackingNumber}
                      </div>
                    </div>
                  )}
                  {transaction.internationalTrackingNumber && (
                    <div className="space-y-2">
                      <span className="font-medium text-gray-600">国际物流:</span>
                      <div className="text-gray-900 font-mono text-sm bg-gray-50 p-2 rounded">
                        {transaction.internationalTrackingNumber}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧：销售统计和快速操作 */}
        <div className="space-y-6">
          {/* 销售统计 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-lg">{EmojiIcons.BarChart}</span>
                销售统计
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {transaction?.soldPrice ? "已售出" : "在库中"}
                  </div>
                  <div className="text-sm text-gray-600">当前状态</div>
                </div>
                
                {transaction?.soldPrice && (
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      ¥{transaction.itemNetProfit ? parseFloat(transaction.itemNetProfit).toLocaleString() : "0"}
                    </div>
                    <div className="text-sm text-gray-600">净利润</div>
                  </div>
                )}
                
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {daysInStock}
                  </div>
                  <div className="text-sm text-gray-600">在库天数</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 快速操作 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-lg">{EmojiIcons.Zap}</span>
                快速操作
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href={`/sales?edit=${item.itemId}`}>
                    <span className="text-lg mr-2">{EmojiIcons.Edit}</span>
                    编辑商品信息
                  </Link>
                </Button>
                
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href={`/sales?print=${item.itemId}`}>
                    <span className="text-lg mr-2">{EmojiIcons.Printer}</span>
                    打印标签
                  </Link>
                </Button>
                
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/warehouse">
                    <span className="text-lg mr-2">{EmojiIcons.Warehouse}</span>
                    仓库管理
                  </Link>
                </Button>
                
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/sales">
                    <span className="text-lg mr-2">{EmojiIcons.ShoppingCart}</span>
                    销售管理
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 相关商品推荐 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-lg">{EmojiIcons.Lightbulb}</span>
                相关商品
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600 text-center py-4">
                暂无相关商品推荐
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
