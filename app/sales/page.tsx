"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import TransactionModal, { TransactionForm } from "@/components/add-new-items";
import { SafeDialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/safe-dialog";
import { EmojiIcons } from "@/components/emoji-icons";
import BatchImport from "@/components/batch-import";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { STATUS_CONFIG, TRANSACTION_STATUSES } from "@/lib/constants";
import { useSearchParams } from "next/navigation";
import { ExportDialog } from "@/components/export-dialog";

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

interface Item {
  itemId: string;
  itemName: string;
  itemSize: string;
  itemBrand?: string;
  itemType?: string;
  itemCondition?: string;
  itemColor?: string;
  itemRemarks?: string;
  itemNumber?: string;
  itemMfgDate?: string;
  photos?: string[];
  position?: string;
  warehousePositionId?: string;
  accessories?: string;
  transactions?: Array<{
    purchaseDate: string;
    purchasePrice: string;
    soldPrice?: string;
    itemNetProfit?: string;
    itemGrossProfit?: string;
    purchasePlatform?: string;
    domesticShipping?: string;
    internationalShipping?: string;
    domesticTrackingNumber?: string;
    internationalTrackingNumber?: string;
    launchDate?: string;
    soldDate?: string;
    soldPlatform?: string;
    soldPriceCurrency?: string;
    soldPriceExchangeRate?: string;
    storageDuration?: string;
    shipping?: string;
  
    orderStatus?: string;
    purchasePriceCurrency?: string;
    purchasePriceExchangeRate?: string;
    listingPlatforms?: string[];
    isReturn?: boolean;
    otherFees?: Array<{
      id: string;
      type: string;
      amount: string;
      currency: string;
      description: string;
    }>;
  }>;
}

// 数据转换函数：将API数据转换为TransactionModal需要的格式
const convertItemToFormData = (item: Item) => {
  const transaction = item.transactions?.[0];
  return {
    // 基本信息
    itemId: item.itemId,
    itemType: item.itemType || "",
    itemName: item.itemName,
    itemBrand: item.itemBrand || "",
    itemNumber: item.itemNumber || "",
    domesticShipping: transaction?.domesticShipping || "0",
    internationalShipping: transaction?.internationalShipping || "0",
    itemSize: item.itemSize || "",
    itemCondition: item.itemCondition || "",
    purchasePrice: transaction?.purchasePrice || "0",
    purchaseDate: transaction?.purchaseDate ? new Date(transaction.purchaseDate) : new Date(),
    orderStatus: transaction?.orderStatus || "在途（国内）",
    purchasePlatform: transaction?.purchasePlatform || "",
    domesticTrackingNumber: transaction?.domesticTrackingNumber || "",
    internationalTrackingNumber: transaction?.internationalTrackingNumber || "",
    itemMfgDate: item.itemMfgDate || "",
    itemColor: item.itemColor || "",
    
    // 交易信息
    launchDate: transaction?.launchDate ? new Date(transaction.launchDate) : null,
    storageDuration: transaction?.storageDuration || "0",
    warehousePositionId: item.warehousePositionId || "",
    listingPlatforms: transaction?.listingPlatforms || [],
    isReturn: transaction?.isReturn || false,
    
    // 售出信息
    soldDate: transaction?.soldDate ? new Date(transaction.soldDate) : null,
    soldPrice: transaction?.soldPrice || "0",
    soldPlatform: transaction?.soldPlatform || "",
    soldPriceCurrency: transaction?.soldPriceCurrency || "JPY",
    soldPriceExchangeRate: transaction?.soldPriceExchangeRate || "0.05",
    
    // 图片和其他
    photos: item.photos || [],
    otherFees: transaction?.otherFees || [],
    accessories: item.accessories || "",
    
    // 其他字段（保持兼容性）
    itemRemarks: item.itemRemarks || "",
    shipping: transaction?.shipping || "0",
    purchasePriceCurrency: transaction?.purchasePriceCurrency || "CNY",
    purchasePriceExchangeRate: transaction?.purchasePriceExchangeRate || "1",
    itemGrossProfit: transaction?.itemGrossProfit || "0",
    itemNetProfit: transaction?.itemNetProfit || "0",
    position: item.position || "",
  };
};

export default function SalesPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [items, setItems] = React.useState<Item[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(40);
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState<string>("all");
  const [start, setStart] = React.useState<string>("");
  const [end, setEnd] = React.useState<string>("");
  const [refreshFlag, setRefreshFlag] = React.useState(0);
  const [editItem, setEditItem] = React.useState<Item | null>(null);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState("");
  const [batchSettlementOpen, setBatchSettlementOpen] = React.useState(false);
  const [settlementExchangeRate, setSettlementExchangeRate] = React.useState("");
  const [selectedItems, setSelectedItems] = React.useState<string[]>([]);
  const [selectAll, setSelectAll] = React.useState(false);
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [dateSort, setDateSort] = React.useState<"asc" | "desc" | null>(null);
  const [durationSort, setDurationSort] = React.useState<"asc" | "desc" | null>(null);
  const [priceSort, setPriceSort] = React.useState<"asc" | "desc" | null>(null);
  const [sizeFilter, setSizeFilter] = React.useState<string>("all");
  const [platformFilter, setPlatformFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [remarksDialogOpen, setRemarksDialogOpen] = React.useState(false);
  const [editingRemarks, setEditingRemarks] = React.useState<{itemId: string, remarks: string} | null>(null);
  


  // 计算未结算订单
  const unsettledItems = React.useMemo(() => {
    return items.filter(item => {
      const transaction = item.transactions?.[0];
      return transaction?.soldPrice && 
             transaction?.orderStatus === "已售出未结算";
    });
  }, [items]);

  // 全选/取消全选逻辑
  React.useEffect(() => {
    if (selectAll) {
      setSelectedItems(unsettledItems.map(item => item.itemId));
    } else {
      setSelectedItems([]);
    }
  }, [selectAll, unsettledItems]);

  // 状态变更处理函数
  const handleStatusChange = async (itemId: string, newStatus: string) => {
    try {
      const response = await fetch("/api/items/batch-update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemIds: [itemId],
          status: newStatus
        })
      });

      if (!response.ok) {
        throw new Error("状态更新失败");
      }

      const result = await response.json();
      
      if (result.success) {
        // 直接更新本地状态，避免重新获取数据
        setItems(prevItems => 
          prevItems.map(item => {
            if (item.itemId === itemId) {
              return {
                ...item,
                transactions: item.transactions?.map(trans => ({
                  ...trans,
                  orderStatus: newStatus
                })) || []
              };
            }
            return item;
          })
        );
        
        toast({
          title: "状态更新成功",
          description: `商品状态已更新为：${newStatus}`,
        });
      } else {
        throw new Error(result.error || "状态更新失败");
      }
    } catch (error) {
      toast({
        title: "状态更新失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    }
  };

  // 备注编辑处理函数
  const handleRemarksEdit = (itemId: string, currentRemarks: string) => {
    setEditingRemarks({ itemId, remarks: currentRemarks });
    setRemarksDialogOpen(true);
  };

  // 保存备注
  const handleSaveRemarks = async () => {
    if (!editingRemarks) return;
    
    try {
      const response = await fetch("/api/items/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: editingRemarks.itemId,
          itemRemarks: editingRemarks.remarks
        })
      });

      if (!response.ok) {
        throw new Error("备注更新失败");
      }

      const result = await response.json();
      
      if (result.success) {
        // 直接更新本地状态，避免重新获取数据
        setItems(prevItems => 
          prevItems.map(item => {
            if (item.itemId === editingRemarks.itemId) {
              return {
                ...item,
                itemRemarks: editingRemarks.remarks
              };
            }
            return item;
          })
        );
        
        toast({
          title: "备注更新成功",
          description: "商品备注已成功更新",
        });
        
        // 关闭对话框
        setRemarksDialogOpen(false);
        setEditingRemarks(null);
      } else {
        throw new Error(result.error || "备注更新失败");
      }
    } catch (error) {
      toast({
        title: "备注更新失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    }
  };

  // 批量结算处理函数
  const handleBatchSettlement = async () => {
    if (selectedItems.length === 0 || !settlementExchangeRate) {
      toast({ title: "请选择订单并输入汇率", variant: "destructive" });
      return;
    }

    try {
      const exchangeRate = parseFloat(settlementExchangeRate);
      if (isNaN(exchangeRate) || exchangeRate <= 0) {
        toast({ title: "请输入有效的汇率", variant: "destructive" });
        return;
      }

      // 调用批量结算API
      const response = await fetch("/api/items/batch-settlement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemIds: selectedItems,
          exchangeRate: exchangeRate
        })
      });

      if (!response.ok) {
        throw new Error("批量结算失败");
      }

      const result = await response.json();
      
      toast({ 
        title: "批量结算成功", 
        description: `成功结算 ${result.successCount} 个订单` 
      });

      // 重置状态
      setBatchSettlementOpen(false);
      setSelectedItems([]);
      setSelectAll(false);
      setSettlementExchangeRate("");
      
      // 刷新数据
      setRefreshFlag(prev => prev + 1);
    } catch (error) {
      console.error("批量结算失败:", error);
      toast({ 
        title: "批量结算失败", 
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive" 
      });
    }
  };

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          ...(status && status !== "all" ? { status } : {}),
          ...(start ? { start } : {}),
          ...(end ? { end } : {}),
          ...(searchQuery ? { search: searchQuery } : {}),
          ...(sizeFilter && sizeFilter !== "all" ? { size: sizeFilter } : {}),
          ...(platformFilter && platformFilter !== "all" ? { platform: platformFilter } : {}),
          ...(dateSort ? { dateSort } : {}),
          ...(durationSort ? { durationSort } : {}),
          ...(priceSort ? { priceSort } : {}),
        });

        const response = await fetch(`/api/items/list?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        let data;
        
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          console.error("JSON解析失败:", parseError);
          console.error("响应内容:", text);
          throw new Error("响应格式错误");
        }

        if (data && data.items) {
          setItems(data.items);
          setTotal(data.total || 0);
          
          // 如果当前页没有数据且不是第一页，则回到上一页
          if (data.items.length === 0 && page > 1 && data.total > 0) {
            const newPage = Math.max(1, page - 1);
            setPage(newPage);
          }
          

        } else {
          console.error("Invalid data format:", data);
          setItems([]);
          setTotal(0);
        }
      } catch (error) {
        console.error("获取数据失败:", error);
        toast({ title: "获取数据失败", variant: "destructive" });
        setItems([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page, pageSize, status, start, end, searchQuery, sizeFilter, platformFilter, dateSort, durationSort, priceSort, refreshFlag, toast]);

  // 处理URL参数，自动打开编辑或打印对话框
  React.useEffect(() => {
    const editParam = searchParams.get('edit');
    const printParam = searchParams.get('print');
    
    if (editParam && items.length > 0) {
      const itemToEdit = items.find(item => item.itemId === editParam);
      if (itemToEdit) {
        setEditItem(itemToEdit);
        setEditDialogOpen(true);
      }
    }
    
    if (printParam && items.length > 0) {
      const itemToPrint = items.find(item => item.itemId === printParam);
      if (itemToPrint) {
        setEditItem(itemToPrint);
        setEditDialogOpen(true);
      }
    }
  }, [searchParams, items]);

  const handleDelete = async (itemId: string) => {
    if (!window.confirm("确定要删除该商品吗？")) return;
    const res = await fetch("/api/items/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    if (res.ok) {
      toast({ title: "删除成功" });
      setRefreshFlag((f) => f + 1);
    } else {
      toast({ title: "删除失败", variant: "destructive" });
    }
  };

  // 统计区数据
  const [stats, setStats] = React.useState({
    totalPurchase: 0,
    totalSold: 0,
    totalProfit: 0,
    averageProfitRate: "0.00",
    inStockCount: 0,
    soldCount: 0,
    totalItems: 0,
    warehouseCount: 0,
    thisMonthSoldAmount: 0,
    thisMonthSoldCount: 0,
    thisMonthSoldProfit: 0,
    thisMonthPurchaseAmount: 0,
    thisMonthPurchaseCount: 0,
    turnoverRate: "0.0",
  });

  // 获取统计数据
  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/items/stats");
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        let data;
        
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          console.error("统计数据JSON解析失败:", parseError);
          console.error("响应内容:", text);
          return;
        }

        if (data.error) {
          console.error("获取统计数据失败:", data.error);
        } else {
          setStats(data);
        }
      } catch (error) {
        console.error("获取统计数据失败:", error);
      }
    };

    fetchStats();
  }, [refreshFlag]);

  return (
    <>
      {/* 成功消息提示 */}
      {showSuccessMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                ✅ {successMessage}
              </p>
            </div>
            <div className="ml-auto">
              <button
                onClick={() => setShowSuccessMessage(false)}
                className="text-green-400 hover:text-green-600"
              >
                <span className="sr-only">关闭</span>
                <div className="w-4 h-4">×</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 页面标题和描述 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">商品管理</h1>
        <p className="text-gray-600">上传、管理和跟踪您的商品库存</p>
      </div>

      {/* 科学统计仪表板 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">销售数据概览</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="text-lg">{EmojiIcons.Calendar}</span>
            数据更新于 {new Date().toLocaleDateString('zh-CN')}
          </div>
        </div>
        
        {/* 核心KPI指标 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              ¥{stats.totalPurchase.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-600">总购入金额</div>
            <div className="text-xs text-green-600 mt-1">📈 累计投资</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              ¥{stats.totalSold.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-600">总销售金额</div>
            <div className="text-xs text-blue-600 mt-1">💰 累计收入</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              ¥{stats.totalProfit.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-600">总净利润</div>
            <div className="text-xs text-purple-600 mt-1">📊 累计盈利</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600 mb-1">
              {stats.averageProfitRate}%
            </div>
            <div className="text-xs text-gray-600">平均利润率</div>
            <div className="text-xs text-indigo-600 mt-1">📈 盈利能力</div>
          </div>
        </div>

        {/* 月度趋势分析 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 本月表现 */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-lg">{EmojiIcons.Calendar}</span>
              本月表现分析
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">购入</span>
                <div className="text-right">
                  <div className="text-sm font-semibold text-blue-600">{stats.thisMonthPurchaseCount}件</div>
                  <div className="text-xs text-gray-500">¥{stats.thisMonthPurchaseAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">销售</span>
                <div className="text-right">
                  <div className="text-sm font-semibold text-green-600">{stats.thisMonthSoldCount}件</div>
                  <div className="text-xs text-gray-500">¥{stats.thisMonthSoldAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                <span className="text-xs text-gray-600">净利润</span>
                <div className="text-sm font-bold text-purple-600">
                  ¥{stats.thisMonthSoldProfit.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* 库存状态 */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-lg">{EmojiIcons.Package}</span>
              库存状态概览
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">商品总数</span>
                <div className="text-sm font-semibold text-indigo-600">{stats.totalItems}</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">在库商品</span>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-indigo-600">{stats.inStockCount}</div>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-500 h-2 rounded-full" 
                      style={{ width: `${(stats.inStockCount / stats.totalItems) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">已售商品</span>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-green-600">{stats.soldCount}</div>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${(stats.soldCount / stats.totalItems) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-green-200">
                <span className="text-xs text-gray-600">周转率</span>
                <div className="text-sm font-bold text-green-600">
                  {stats.turnoverRate}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 本月统计 + 库存状态 + 快速操作 */}
      {/* 库存状态统计 */}

      {/* 操作按钮和筛选区域 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-6">
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">🔍</span>
            <Input
              placeholder="搜索商品..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-40"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 px-3">
                <span className="text-lg">🔧</span>
                筛选
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setStatus("all")}>全部状态</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatus(TRANSACTION_STATUSES.IN_TRANSIT_DOMESTIC)}>在途（国内）</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatus(TRANSACTION_STATUSES.IN_TRANSIT_JAPAN)}>在途（日本）</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatus(TRANSACTION_STATUSES.NOT_LISTED)}>未上架</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatus(TRANSACTION_STATUSES.LISTED)}>已上架</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatus(TRANSACTION_STATUSES.IN_TRANSACTION)}>交易中</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatus(TRANSACTION_STATUSES.RETURNING)}>退货中</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatus(TRANSACTION_STATUSES.COMPLETED)}>已完成</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          
          <Input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-32"
          />
          
          <Input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-32"
          />

          <TransactionModal />
          <BatchImport />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setBatchSettlementOpen(true)}
            className="gap-1 px-3"
          >
            <span className="text-lg">{EmojiIcons.Calculator}</span>
            批量结算
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setExportDialogOpen(true)}
            className="gap-1 px-3"
          >
            <span className="text-lg">{EmojiIcons.Download}</span>
            导出数据
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.href = '/warehouse'}
            className="gap-1 px-3"
          >
            <span className="text-lg">{EmojiIcons.Warehouse}</span>
            仓库管理
          </Button>
          <Button variant="outline" size="sm" onClick={() => setRefreshFlag((f) => f + 1)} className="gap-1 px-3">
            <span className="text-lg">{EmojiIcons.RefreshCw}</span>
            刷新
          </Button>
        </div>
      </div>

      {/* 表格区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{EmojiIcons.Package}</span>
                    商品信息
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{EmojiIcons.Calendar}</span>
                    购入时间
                    <button
                      onClick={() => setDateSort(dateSort === "asc" ? "desc" : "asc")}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {dateSort === "asc" ? (
                        <span className="text-lg">{EmojiIcons.ChevronUp}</span>
                      ) : dateSort === "desc" ? (
                        <span className="text-lg">{EmojiIcons.ChevronDown}</span>
                      ) : (
                        <span className="text-lg">{EmojiIcons.ChevronUp}</span>
                      )}
                    </button>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{EmojiIcons.Clock}</span>
                    在库时长
                    <button
                      onClick={() => setDurationSort(durationSort === "asc" ? "desc" : "asc")}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {durationSort === "asc" ? (
                        <span className="text-lg">{EmojiIcons.ChevronUp}</span>
                      ) : durationSort === "desc" ? (
                        <span className="text-lg">{EmojiIcons.ChevronDown}</span>
                      ) : (
                        <span className="text-lg">{EmojiIcons.ChevronUp}</span>
                      )}
                    </button>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{EmojiIcons.Tag}</span>
                    尺寸
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                          <span className="text-lg">{EmojiIcons.Filter}</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-32">
                        <DropdownMenuItem onClick={() => setSizeFilter("all")}>
                          全部尺寸
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSizeFilter("S")}>
                          S
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSizeFilter("M")}>
                          M
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSizeFilter("L")}>
                          L
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSizeFilter("XL")}>
                          XL
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSizeFilter("42")}>
                          42
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSizeFilter("43")}>
                          43
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSizeFilter("44")}>
                          44
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{EmojiIcons.Eye}</span>
                    状态
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                          <span className="text-lg">{EmojiIcons.Filter}</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-32">
                        <DropdownMenuItem onClick={() => setStatus("all")}>
                          全部状态
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatus(TRANSACTION_STATUSES.IN_TRANSIT_DOMESTIC)}>
                          在途（国内）
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatus(TRANSACTION_STATUSES.IN_TRANSIT_JAPAN)}>
                          在途（日本）
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatus(TRANSACTION_STATUSES.NOT_LISTED)}>
                          未上架
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatus(TRANSACTION_STATUSES.LISTED)}>
                          已上架
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatus(TRANSACTION_STATUSES.IN_TRANSACTION)}>
                          交易中
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatus(TRANSACTION_STATUSES.RETURNING)}>
                          退货中
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatus(TRANSACTION_STATUSES.COMPLETED)}>
                          已完成
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{EmojiIcons.DollarSign}</span>
                    购入价格
                    <button
                      onClick={() => setPriceSort(priceSort === "asc" ? "desc" : "asc")}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {priceSort === "asc" ? (
                        <span className="text-lg">{EmojiIcons.ChevronUp}</span>
                      ) : priceSort === "desc" ? (
                        <span className="text-lg">{EmojiIcons.ChevronDown}</span>
                      ) : (
                        <span className="text-lg">{EmojiIcons.ChevronUp}</span>
                      )}
                    </button>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{EmojiIcons.ShoppingCart}</span>
                    购入平台
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                          <span className="text-lg">{EmojiIcons.Filter}</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-32">
                        <DropdownMenuItem onClick={() => setPlatformFilter("all")}>
                          全部平台
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPlatformFilter("淘宝")}>
                          淘宝
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem onClick={() => setPlatformFilter("闲鱼")}>
                          闲鱼
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPlatformFilter("闲鱼")}>
                          95分
                        </DropdownMenuItem>
                        
                        
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{EmojiIcons.FileText}</span>
                    备注
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <span className="text-lg animate-spin">{EmojiIcons.RefreshCw}</span>
                      加载中...
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <span className="text-4xl mx-auto mb-4 text-gray-300">{EmojiIcons.Package}</span>
                      <p className="text-lg font-medium">暂无商品数据</p>
                      <p className="text-sm">开始添加您的第一个商品吧</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const t = item.transactions?.[0];
                  const daysInStock = t?.purchaseDate ? Math.floor((Date.now() - new Date(t.purchaseDate).getTime()) / (1000 * 60 * 60 * 24)) : "-";
                  return (
                    <tr key={item.itemId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{item.itemName}</div>
                          <div className="text-sm text-gray-500">ID: {item.itemId}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {t?.purchaseDate ? format(new Date(t.purchaseDate), "yyyy-MM-dd") : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {daysInStock !== "-" ? `${daysInStock}天` : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.itemSize}</td>
                      <td className="px-6 py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-2 hover:bg-gray-100 rounded px-2 py-1 transition-colors">
                              <StatusBadge status={item.transactions?.[0]?.orderStatus || "在途（国内）"} />
                            
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-40">
                            <DropdownMenuItem onClick={() => handleStatusChange(item.itemId, "在途（国内）")}>
                              在途（国内）
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(item.itemId, "在途（日本）")}>
                              在途（日本）
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(item.itemId, "未上架")}>
                              未上架
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(item.itemId, "已上架")}>
                              已上架
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(item.itemId, "交易中")}>
                              交易中
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(item.itemId, "退货中")}>
                              退货中
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(item.itemId, "已完成")}>
                              已完成
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(item.itemId, "已售出未结算")}>
                              已售出未结算
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        ¥{t?.purchasePrice ? parseFloat(t.purchasePrice).toLocaleString() : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {t?.purchasePlatform || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <div 
                            className="text-sm text-gray-900 cursor-pointer hover:bg-gray-100 rounded px-2 py-1 transition-colors"
                            title={item.itemRemarks || "无备注"}
                            onClick={() => handleRemarksEdit(item.itemId, item.itemRemarks || "")}
                          >
                            {item.itemRemarks ? (
                              item.itemRemarks.length > 20 ? 
                                `${item.itemRemarks.substring(0, 20)}...` : 
                                item.itemRemarks
                            ) : (
                              <span className="text-gray-400 italic">无备注</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <span className="text-lg">{EmojiIcons.MoreHorizontal}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
              setEditItem(item);
              setEditDialogOpen(true);
            }} className="gap-2">
                              <span className="text-lg">{EmojiIcons.Edit}</span>
                              编辑商品
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={async () => {
                                try {
                                  const response = await fetch("/api/items/copy", {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({ itemId: item.itemId }),
                                  });

                                  const result = await response.json();
                                  
                                  if (result.success) {
                                    toast({
                                      title: "复制成功",
                                      description: `新商品ID: ${result.data.newItemId}`,
                                    });
                                    // 刷新数据
                                    window.location.reload();
                                  } else {
                                    toast({
                                      title: "复制失败",
                                      description: result.error,
                                      variant: "destructive",
                                    });
                                  }
                                } catch {
                                  toast({
                                    title: "复制失败",
                                    description: "网络错误",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              className="gap-2"
                            >
                              📋 Copy出品
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(item.itemId)}
                              className="text-red-600 gap-2"
                            >
                              <span className="text-lg">{EmojiIcons.Trash2}</span>
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 分页区域 */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
        <div className="text-sm text-gray-700">
          显示第 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} 条，共 {total} 条记录
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page === 1} 
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            上一页
          </Button>
          <div className="flex items-center gap-1">
            {(() => {
              const totalPages = Math.ceil(total / pageSize);
              const maxVisiblePages = 7; // 最多显示7个页码
              let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
              const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
              
              // 调整起始页，确保显示足够的页码
              if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
              }
              
              const pages = [];
              
              // 添加第一页
              if (startPage > 1) {
                pages.push(
                  <Button
                    key={1}
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(1)}
                    className="w-8 h-8 p-0"
                  >
                    1
                  </Button>
                );
                if (startPage > 2) {
                  pages.push(<span key="ellipsis1" className="px-2 text-gray-500">...</span>);
                }
              }
              
              // 添加中间页码
              for (let i = startPage; i <= endPage; i++) {
                pages.push(
                  <Button
                    key={i}
                    variant={page === i ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(i)}
                    className="w-8 h-8 p-0"
                  >
                    {i}
                  </Button>
                );
              }
              
              // 添加最后一页
              if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                  pages.push(<span key="ellipsis2" className="px-2 text-gray-500">...</span>);
                }
                pages.push(
                  <Button
                    key={totalPages}
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(totalPages)}
                    className="w-8 h-8 p-0"
                  >
                    {totalPages}
                  </Button>
                );
              }
              
              return pages;
            })()}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page * pageSize >= total} 
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </Button>
        </div>
      </div>

      {/* 编辑对话框 */}
      <SafeDialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) {
          setEditItem(null);
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">{EmojiIcons.Package}</span>
              编辑商品
            </DialogTitle>
          </DialogHeader>
          {editItem && (
            <TransactionForm 
              existingData={convertItemToFormData(editItem)} 
              onSuccess={() => {
                setEditDialogOpen(false);
                setEditItem(null);
                setRefreshFlag(prev => prev + 1);
                
                // 显示成功消息
                setSuccessMessage("商品信息已成功更新！");
                setShowSuccessMessage(true);
                
                // 3秒后隐藏成功消息
                setTimeout(() => {
                  setShowSuccessMessage(false);
                }, 1500);
              }}
            />
          )}
        </DialogContent>
      </SafeDialog>

      {/* 批量结算弹窗 */}
      <SafeDialog open={batchSettlementOpen} onOpenChange={setBatchSettlementOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">{EmojiIcons.Calculator}</span>
              批量结算
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* 说明信息 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>说明：</strong>选择已售出未结算的订单，输入结算汇率，系统将自动计算实际利润率和利润。
              </p>
            </div>

            {/* 汇率输入 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">结算汇率 (JPY → CNY)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="请输入汇率，如：0.05"
                value={settlementExchangeRate}
                onChange={(e) => setSettlementExchangeRate(e.target.value)}
                className="w-full"
              />
            </div>

            {/* 未结算订单列表 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">待结算订单</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectAll(!selectAll)}
                  >
                    {selectAll ? "取消全选" : "全选"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedItems([])}
                  >
                    清空选择
                  </Button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto border rounded-lg">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={(e) => setSelectAll(e.target.checked)}
                        />
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">商品名称</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">售出价格(JPY)</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">购入价格(CNY)</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {unsettledItems.map((item) => (
                      <tr key={item.itemId} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.itemId)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItems([...selectedItems, item.itemId]);
                              } else {
                                setSelectedItems(selectedItems.filter(id => id !== item.itemId));
                              }
                            }}
                          />
                        </td>
                        <td className="px-4 py-2 text-sm">{item.itemName}</td>
                        <td className="px-4 py-2 text-sm">¥{item.transactions?.[0]?.soldPrice || "0"}</td>
                        <td className="px-4 py-2 text-sm">¥{item.transactions?.[0]?.purchasePrice || "0"}</td>
                        <td className="px-4 py-2 text-sm">
                          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                            已售出未结算
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {unsettledItems.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  暂无已售出未结算的订单
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setBatchSettlementOpen(false)}
              >
                取消
              </Button>
              <Button
                onClick={handleBatchSettlement}
                disabled={selectedItems.length === 0 || !settlementExchangeRate}
                className="bg-blue-600 hover:bg-blue-700"
              >
                确认结算 ({selectedItems.length} 个订单)
              </Button>
            </div>
          </div>
        </DialogContent>
      </SafeDialog>

      {/* 导出数据对话框 */}
      <ExportDialog 
        open={exportDialogOpen} 
        onOpenChange={setExportDialogOpen} 
      />

      {/* 备注编辑对话框 */}
      <SafeDialog open={remarksDialogOpen} onOpenChange={setRemarksDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">{EmojiIcons.FileText}</span>
              编辑备注
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="remarks" className="text-sm font-medium">
                商品备注
              </Label>
              <Textarea
                id="remarks"
                value={editingRemarks?.remarks || ""}
                onChange={(e) => setEditingRemarks(prev => prev ? {...prev, remarks: e.target.value} : null)}
                placeholder="输入商品备注信息..."
                className="mt-1"
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setRemarksDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleSaveRemarks}
              className="bg-blue-600 hover:bg-blue-700"
            >
              保存备注
            </Button>
          </div>
        </DialogContent>
      </SafeDialog>
    </>
  );
} 