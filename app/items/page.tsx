"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { EmojiIcons } from "@/components/emoji-icons";
import { STATUS_CONFIG } from "@/lib/constants";
import Link from "next/link";
import { format } from "date-fns";
import { useSearchParams } from "next/navigation";
import { SafeDialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/safe-dialog";
import { TransactionForm } from "@/components/add-new-items";
import { SmartSKUForm } from "@/components/smart-sku-form";
import { ToySeriesCard } from "@/components/toy-series-card";

// 按货号聚合的商品数据接口
interface GroupedItem {
  itemNumber: string;
  itemName: string;
  itemBrand: string;
  itemType: string;
  itemColor?: string;
  itemCondition?: string;
  totalItems: number;
  inStockCount: number;
  soldCount: number;
  totalPurchaseValue: number;
  totalSoldValue: number;
  totalProfit: number;
  averageProfitRate: number;
  sizes: Array<{
    size: string;
    count: number;
    inStock: number;
    sold: number;
    avgPurchasePrice: number;
    avgSoldPrice: number;
    items: Array<{
      itemId: string;
      itemSize: string;
      purchasePrice: number;
      soldPrice?: number;
      orderStatus: string;
      purchaseDate: string;
      soldDate?: string;
      profit?: number;
    }>;
  }>;
  photos: string[];
  latestPurchaseDate: string;
  oldestPurchaseDate: string;
}

// 潮玩系列聚合数据接口
interface ToySeriesGrouped {
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

function GroupedItemCard({ item }: { item: GroupedItem }) {
  const daysInStock = item.latestPurchaseDate 
    ? Math.floor((Date.now() - new Date(item.latestPurchaseDate).getTime()) / (1000 * 60 * 60 * 24)) 
    : 0;

  // 计算主要状态（在库商品最多的状态）
  const mainStatus = item.inStockCount > item.soldCount ? "在库中" : "已售出";
  
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
      <Link href={`/items/sku/${encodeURIComponent(item.itemNumber)}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {item.itemName}
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">货号: {item.itemNumber}</p>
            </div>
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
              {item.totalItems}件
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">品牌:</span>
                <span className="font-medium">{item.itemBrand || "未知"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">类型:</span>
                <span className="font-medium">{item.itemType}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">成色:</span>
                <span className="font-medium">{item.itemCondition || "未知"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">颜色:</span>
                <span className="font-medium">{item.itemColor || "未知"}</span>
              </div>
            </div>

            {/* 尺码信息 */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600 mb-2">可选尺码:</div>
              <div className="flex flex-wrap gap-1">
                {item.sizes.slice(0, 6).map((size) => (
                  <Badge 
                    key={size.size} 
                    variant="outline" 
                    className={`text-xs ${
                      size.inStock > 0 
                        ? "bg-green-100 text-green-700 border-green-200" 
                        : "bg-gray-100 text-gray-500 border-gray-200"
                    }`}
                  >
                    {size.size} ({size.count})
                  </Badge>
                ))}
                {item.sizes.length > 6 && (
                  <Badge variant="outline" className="text-xs bg-gray-100 text-gray-500">
                    +{item.sizes.length - 6}
                  </Badge>
                )}
              </div>
            </div>

            {/* 价格和利润信息 */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">总投入:</span>
                  <div className="font-semibold text-green-600">
                    ¥{item.totalPurchaseValue.toLocaleString()}
                  </div>
                </div>
                {item.totalSoldValue > 0 && (
                  <div>
                    <span className="text-gray-500">已售出:</span>
                    <div className="font-semibold text-blue-600">
                      ¥{item.totalSoldValue.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
              {item.totalProfit > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">总利润:</span>
                    <div className="font-semibold text-purple-600">
                      ¥{item.totalProfit.toLocaleString()} ({item.averageProfitRate.toFixed(1)}%)
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 库存状态 */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-gray-600">在库 {item.inStockCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span className="text-gray-600">已售 {item.soldCount}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-gray-500">
                <span className="text-lg">{EmojiIcons.Clock}</span>
                {daysInStock}天
              </div>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}

export default function ItemsPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [items, setItems] = React.useState<GroupedItem[]>([]);
  const [toySeries, setToySeries] = React.useState<ToySeriesGrouped[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [categories, setCategories] = React.useState<any[]>([]);
  const [addSkuDialogOpen, setAddSkuDialogOpen] = React.useState(false);
  const [refreshFlag, setRefreshFlag] = React.useState(0);
  const pageSize = 24; // 每页显示24个商品卡片

  // 处理URL参数
  React.useEffect(() => {
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    
    if (status === 'in_stock') {
      setStatusFilter('未上架,已上架,在途（国内）,在途（日本）');
    } else if (status === 'sold') {
      setStatusFilter('已完成');
    } else {
      setStatusFilter('all');
    }
    
    if (category && category !== 'all') {
      setCategoryFilter(category);
    } else {
      setCategoryFilter('all');
    }
  }, [searchParams]);

  // 获取商品数据
  const fetchItems = React.useCallback(async () => {
    setLoading(true);
    try {
      // 并行获取普通商品和潮玩系列数据
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(searchQuery ? { search: searchQuery } : {}),
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        ...(categoryFilter !== "all" ? { itemType: categoryFilter } : {}),
      });

      // 根据筛选条件决定是否获取潮玩数据
      const shouldFetchToys = categoryFilter === "all" || categoryFilter === "潮玩类";
      
      const requests = [fetch(`/api/items/grouped?${params.toString()}`)];
      if (shouldFetchToys) {
        requests.push(fetch(`/api/toys/series-grouped?${params.toString()}`));
      }

      const responses = await Promise.all(requests);
      const itemsResponse = responses[0];
      const toySeriesResponse = responses[1];
      
      if (!itemsResponse.ok) {
        throw new Error(`HTTP error! status: ${itemsResponse.status}`);
      }

      const itemsData = await itemsResponse.json();
      const toySeriesData = toySeriesResponse?.ok ? await toySeriesResponse.json() : { success: false, data: [] };
      
      if (itemsData && itemsData.items) {
        // 如果筛选潮玩类，只显示潮玩系列，不显示单个商品
        // 如果筛选其他类型，过滤掉潮玩类商品
        // 如果显示全部，过滤掉潮玩类商品（因为它们会在系列聚合中显示）
        let filteredItems = itemsData.items;
        if (categoryFilter === "潮玩类") {
          filteredItems = []; // 潮玩类只显示系列聚合，不显示单个商品
        } else {
          filteredItems = itemsData.items.filter((item: GroupedItem) => item.itemType !== "潮玩类");
        }
        
        setItems(filteredItems);
        setTotal(itemsData.total || 0);
      } else {
        setItems([]);
        setTotal(0);
      }

      // 设置潮玩系列数据
      if (shouldFetchToys && toySeriesData && toySeriesData.success && toySeriesData.data) {
        setToySeries(toySeriesData.data);
      } else {
        setToySeries([]);
      }
    } catch (error) {
      console.error("获取商品数据失败:", error);
      toast({ 
        title: "获取数据失败", 
        description: "请检查网络连接后重试",
        variant: "destructive" 
      });
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, statusFilter, categoryFilter, refreshFlag, toast]);

  React.useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // 获取商品类型数据
  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/items/categories');
        const data = await response.json();
        if (data.success) {
          setCategories(data.categories);
        }
      } catch (error) {
        console.error('获取商品类型失败:', error);
      }
    };

    fetchCategories();
  }, []);

  // 搜索防抖
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1); // 搜索时重置到第一页
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">商品库存</h1>
          <p className="text-gray-600">浏览和管理您的商品库存，按货号分类展示</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setAddSkuDialogOpen(true)}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <span className="text-lg">{EmojiIcons.Plus}</span>
            新增SKU
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/sales'}
            className="gap-2"
          >
            <span className="text-lg">{EmojiIcons.ShoppingCart}</span>
            销售管理
          </Button>
        </div>
      </div>

      {/* 商品类型分类卡片 */}
      {categories.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-lg">{EmojiIcons.Tag}</span>
            商品分类
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card 
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                categoryFilter === "all" ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-gray-50"
              }`}
              onClick={() => setCategoryFilter("all")}
            >
              <CardContent className="p-4 text-center">
                <div className="text-2xl mb-2">📦</div>
                <div className="font-medium text-sm">全部商品</div>
                <div className="text-xs text-gray-500 mt-1">
                  {categories.reduce((sum, cat) => sum + cat.total, 0)}件
                </div>
              </CardContent>
            </Card>
            
            {categories.map((category) => (
              <Card 
                key={category.type}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  categoryFilter === category.type ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-gray-50"
                }`}
                onClick={() => setCategoryFilter(category.type)}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl mb-2">{category.config.icon}</div>
                  <div className="font-medium text-sm">{category.type}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {category.total}件
                  </div>
                  <div className="flex justify-center gap-1 mt-2">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      在库{category.inStock}
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      已售{category.sold}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">🔍</span>
            <Input
              placeholder="搜索商品名称、货号、品牌..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button 
            onClick={() => setAddSkuDialogOpen(true)}
            size="sm"
            className="gap-1 px-3 bg-green-600 hover:bg-green-700"
          >
            <span className="text-lg">{EmojiIcons.Plus}</span>
            新增
          </Button>
          <Button 
            variant="outline" 
            onClick={fetchItems}
            className="gap-2"
          >
            <span className="text-lg">{EmojiIcons.RefreshCw}</span>
            刷新
          </Button>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{total}</div>
              <div className="text-sm text-gray-600">商品总数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {items.reduce((sum, item) => sum + item.soldCount, 0)}
              </div>
              <div className="text-sm text-gray-600">已售出</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {items.reduce((sum, item) => sum + item.inStockCount, 0)}
              </div>
              <div className="text-sm text-gray-600">在库中</div>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            显示第 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} 条，共 {total} 条记录
          </div>
        </div>
      </div>

      {/* 商品卡片网格 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-gray-500">
              <span className="text-lg animate-spin">{EmojiIcons.RefreshCw}</span>
              加载中...
            </div>
          </div>
        ) : items.length === 0 && toySeries.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <span className="text-4xl mx-auto mb-4 text-gray-300 block">{EmojiIcons.Package}</span>
              <p className="text-lg font-medium">暂无商品数据</p>
              <p className="text-sm">开始添加您的第一个商品吧</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* 潮玩系列卡片 */}
            {toySeries.map((series) => (
              <ToySeriesCard key={series.seriesId} {...series} />
            ))}
            
            {/* 普通商品卡片 */}
            {items.map((item) => (
              <GroupedItemCard key={item.itemNumber} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page === 1} 
            onClick={() => setPage(page - 1)}
          >
            上一页
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (page <= 4) {
                pageNum = i + 1;
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = page - 3 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page === totalPages} 
            onClick={() => setPage(page + 1)}
          >
            下一页
          </Button>
        </div>
      )}

      {/* 新增SKU对话框 */}
      <SafeDialog open={addSkuDialogOpen} onOpenChange={setAddSkuDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">{EmojiIcons.Plus}</span>
              新增SKU
            </DialogTitle>
          </DialogHeader>
          <SmartSKUForm 
            onSuccess={() => {
              setAddSkuDialogOpen(false);
              setRefreshFlag(prev => prev + 1);
            }}
          />
        </DialogContent>
      </SafeDialog>
    </div>
  );
}
