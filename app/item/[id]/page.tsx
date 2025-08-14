import { getCachedItems } from '@/lib/cache';
import { notFound } from 'next/navigation';
import Link from 'next/link';

interface ItemPageProps {
  params: {
    id: string;
  };
}

export default async function ItemPage({ params }: ItemPageProps) {
  const items = await getCachedItems();
  const id = await params.id;
  const item = items.find(item => item.itemId === id);

  if (!item) {
    notFound();
  }

  const transaction = item.transactions?.[0];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {item.itemName}
              </h1>
              <p className="text-gray-600">商品ID: {item.itemId}</p>
            </div>
            <div className="flex gap-3">
              <Link
                href={`/sales?edit=${item.itemId}`}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                编辑商品
              </Link>
            </div>
          </div>
        </div>

        {/* 商品信息卡片 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">基本信息</h2>
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
                <span className="font-medium text-gray-600">型号:</span>
                <span className="text-gray-900">{item.itemNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">尺寸:</span>
                <span className="text-gray-900">{item.itemSize || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">颜色:</span>
                <span className="text-gray-900">{item.itemColor || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">成色:</span>
                <span className="text-gray-900">{item.itemCondition || 'N/A'}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">生产日期:</span>
                <span className="text-gray-900">{item.itemMfgDate || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">商品状态:</span>
                <span className="text-gray-900">{item.transactions?.[0]?.orderStatus || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">仓库位置:</span>
                <span className="text-gray-900">{item.position || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">备注:</span>
                <span className="text-gray-900">{item.itemRemarks || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 交易信息卡片 */}
        {transaction && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">交易信息</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">购入价格:</span>
                  <span className="text-green-600 font-semibold">
                    ¥{transaction.purchasePrice || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">购入日期:</span>
                  <span className="text-gray-900">
                    {transaction.purchaseDate ? new Date(transaction.purchaseDate).toLocaleDateString('zh-CN') : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">购入平台:</span>
                  <span className="text-gray-900">{transaction.purchasePlatform || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">国内运费:</span>
                  <span className="text-gray-900">{transaction.domesticShipping || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">国际运费:</span>
                  <span className="text-gray-900">{transaction.internationalShipping || 'N/A'}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">国内单号:</span>
                  <span className="text-gray-900">{transaction.domesticTrackingNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">国际单号:</span>
                  <span className="text-gray-900">{transaction.internationalTrackingNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">上架日期:</span>
                  <span className="text-gray-900">
                    {transaction.launchDate ? new Date(transaction.launchDate).toLocaleDateString('zh-CN') : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">存储时长:</span>
                  <span className="text-gray-900">{transaction.storageDuration || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">交易状态:</span>
                  <span className="text-gray-900">{transaction.orderStatus || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 其他费用 */}
        {transaction?.otherFees && transaction.otherFees.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">其他费用</h2>
            <div className="space-y-3">
              {transaction.otherFees.map((fee, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium text-gray-800">{fee.type}</span>
                    {fee.description && (
                      <p className="text-sm text-gray-600">{fee.description}</p>
                    )}
                  </div>
                  <span className="text-red-600 font-semibold">
                    {fee.amount} {fee.currency}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 上架平台 */}
        {transaction?.listingPlatforms && transaction.listingPlatforms.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">上架平台</h2>
            <div className="flex flex-wrap gap-2">
              {transaction.listingPlatforms.map((platform, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {platform}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 售出信息 */}
        {transaction?.soldDate && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">售出信息</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">售出日期:</span>
                  <span className="text-gray-900">
                    {transaction.soldDate ? new Date(transaction.soldDate).toLocaleDateString('zh-CN') : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">售出价格:</span>
                  <span className="text-red-600 font-semibold">
                    {transaction.soldPrice} {transaction.soldPriceCurrency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">售出平台:</span>
                  <span className="text-gray-900">{transaction.soldPlatform || 'N/A'}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">汇率:</span>
                  <span className="text-gray-900">{transaction.soldPriceExchangeRate || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">毛利润:</span>
                  <span className="text-green-600 font-semibold">
                    {item.itemGrossProfit || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">净利润:</span>
                  <span className="text-green-600 font-semibold">
                    {item.itemNetProfit || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 返回按钮 */}
        <div className="text-center">
          <Link
            href="/sales"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            返回商品列表
          </Link>
        </div>
      </div>
    </div>
  );
}
