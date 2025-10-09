"use client";
import * as React from "react";
import { EmojiIcons } from "@/components/emoji-icons";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

import TransactionModal, { TransactionForm } from "@/components/add-new-items";
import { SafeDialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/safe-dialog";
// 图标已替换为Emoji
import { ExportDialog } from "@/components/export-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatCNY, convertToCNY } from "@/lib/utils";

function StatusBadge({ status }: { status: string }) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
        return { color: "bg-green-100 text-green-800 border-green-200", icon: "✓" };
      case "pending":
        return { color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: "⏳" };
      case "cancelled":
        return { color: "bg-red-100 text-red-800 border-red-200", icon: "✗" };
      default:
        return { color: "bg-gray-100 text-gray-800 border-gray-200", icon: "?" };
    }
  };

  const config = getStatusConfig(status);
  return (
    <Badge variant="outline" className={`${config.color} border`}>
      <span className="mr-1">{config.icon}</span>
      {status === "completed" ? "已完成" : status === "pending" ? "进行中" : status === "cancelled" ? "已取消" : status}
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

// 数据转换函数：将API数据转换为TransactionForm需要的格式
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
    soldPriceCurrency: transaction?.soldPriceCurrency || "CNY",
    soldPriceExchangeRate: transaction?.soldPriceExchangeRate || "1",
    
    // 图片和其他
    photos: item.photos || [],
    otherFees: transaction?.otherFees || [],
    accessories: item.accessories || "",
    
    // 其他字段（保持兼容性）
    itemRemarks: item.itemRemarks || "",
    shipping: transaction?.shipping || "0",
          orderStatus: transaction?.orderStatus || "在途（国内）",
    purchasePriceCurrency: transaction?.purchasePriceCurrency || "CNY",
    purchasePriceExchangeRate: transaction?.purchasePriceExchangeRate || "1",
    itemGrossProfit: transaction?.itemGrossProfit || "0",
    itemNetProfit: transaction?.itemNetProfit || "0",
    position: item.position || "",
  };
};

export default function MonthPage({ params }: { params: Promise<{ month: string }> }) {
  const { toast } = useToast();
  const [items, setItems] = React.useState<Item[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(40);
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState<string>("all");
  const [refreshFlag, setRefreshFlag] = React.useState(0);
  const [editItem, setEditItem] = React.useState<Item | null>(null);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [dateSort, setDateSort] = React.useState<"asc" | "desc" | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [monthData, setMonthData] = React.useState<{ month: string } | null>(null);
  const [remarksDialogOpen, setRemarksDialogOpen] = React.useState(false);
  const [editingRemarks, setEditingRemarks] = React.useState<{itemId: string, remarks: string} | null>(null);
  


  // 解析月份参数
  React.useEffect(() => {
    params.then((data) => {
      setMonthData(data);
    });
  }, [params]);

  // 根据月份计算开始和结束日期
  const getMonthDateRange = (monthStr: string) => {
    try {
      const [year, month] = monthStr.split("-");
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      
      // 验证年份和月份是否有效
      if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        console.error("无效的月份格式:", monthStr);
        // 返回当前月份作为默认值
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        return {
          start: `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`,
          end: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${new Date(currentYear, currentMonth, 0).getDate()}`
        };
      }
      
      const startDate = new Date(yearNum, monthNum - 1, 1);
      const endDate = new Date(yearNum, monthNum, 0);
      
      // 验证日期对象是否有效
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error("无效的日期对象");
      }
      
      return {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      };
    } catch (error) {
      console.error("计算月份日期范围失败:", error, "月份字符串:", monthStr);
      // 返回当前月份作为默认值
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      return {
        start: `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`,
        end: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${new Date(currentYear, currentMonth, 0).getDate()}`
      };
    }
  };

  // 格式化月份显示
  const formatMonthDisplay = (monthStr: string) => {
    try {
      const [year, month] = monthStr.split("-");
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      
      // 验证年份和月份是否有效
      if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        console.error("无效的月份格式:", monthStr);
        return "无效月份";
      }
      
      const monthNames = [
        "一月", "二月", "三月", "四月", "五月", "六月",
        "七月", "八月", "九月", "十月", "十一月", "十二月"
      ];
      return `${yearNum}年${monthNames[monthNum - 1]}`;
    } catch (error) {
      console.error("格式化月份显示失败:", error, "月份字符串:", monthStr);
      return "格式化失败";
    }
  };

  React.useEffect(() => {
    if (!monthData) return;
    
    setLoading(true);
    const { start, end } = getMonthDateRange(monthData.month);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      start,
      end,
      ...(status && status !== "all" ? { status } : {}),
      ...(searchQuery ? { search: searchQuery } : {}),
    });
    
    fetch(`/api/items/list?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
        
        // 如果当前页没有数据且不是第一页，则回到上一页
        if (data.items.length === 0 && page > 1 && data.total > 0) {
          const newPage = Math.max(1, page - 1);
          setPage(newPage);
        }
        

      })
      .catch(() => {
        toast({ title: "获取数据失败", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, status, searchQuery, refreshFlag, monthData, toast]);

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
    monthlyPurchase: 0,
    monthlySold: 0,
    monthlyProfitRate: "0.00",
    monthlySoldCount: 0,
    isMonthlyView: true,
  });

  // 获取统计数据
  React.useEffect(() => {
    if (!monthData) return;
    
    const { start, end } = getMonthDateRange(monthData.month);
    
    // 直接获取商品列表数据，然后计算该月份的统计数据
    fetch(`/api/items/list?start=${start}&end=${end}&pageSize=1000`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          console.error("获取商品数据失败:", data.error);
        } else {
          // 计算该月份的统计数据
          const monthlyItems = data.items || [];
          
          const monthlyPurchase = monthlyItems.reduce((sum: number, item: Item) => {
            const transaction = item.transactions?.[0];
            return sum + (transaction?.purchasePrice ? parseFloat(transaction.purchasePrice) : 0);
          }, 0);
          
          const monthlySold = monthlyItems.reduce((sum: number, item: Item) => {
            const transaction = item.transactions?.[0];
            return sum + (transaction?.soldPrice ? parseFloat(transaction.soldPrice) : 0);
          }, 0);
          
          const monthlySoldCount = monthlyItems.filter((item: Item) => 
            item.transactions?.[0]?.soldPrice
          ).length;
          
          const monthlyProfitRate = monthlySold > 0 && monthlyPurchase > 0 
            ? (((monthlySold - monthlyPurchase) / monthlyPurchase) * 100).toFixed(2)
            : "0.00";
          
          setStats({
            monthlyPurchase,
            monthlySold,
            monthlyProfitRate,
            monthlySoldCount,
            isMonthlyView: true,
          });
          
          console.log("月份统计数据:", {
            month: monthData.month,
            start,
            end,
            monthlyPurchase,
            monthlySold,
            monthlyProfitRate,
            monthlySoldCount,
            itemCount: monthlyItems.length
          });
        }
      })
      .catch((error) => {
        console.error("获取统计数据失败:", error);
        // 出错时保持默认值
      });
  }, [monthData, refreshFlag]);

  if (!monthData) {
    return <div>加载中...</div>;
  }

  return (
    <>
      {/* 页面标题和描述 */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/sales">
            <Button variant="outline" size="sm" className="gap-2">
              <span className="text-lg"></span>
              返回全部
            </Button>
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {formatMonthDisplay(monthData.month)} 商品管理
        </h1>
        <p className="text-gray-600">
          查看和管理 {formatMonthDisplay(monthData.month)} 的商品库存和销售数据
        </p>
      </div>

      {/* 统计卡片区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">本月购入金额</p>
              <p className="text-2xl font-bold text-gray-900">¥{(stats.monthlyPurchase || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <span className="text-lg">{EmojiIcons.ShoppingCart}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">销售金额</p>
              <p className="text-2xl font-bold text-gray-900">¥{(stats.monthlySold || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <span className="text-lg">{EmojiIcons.TrendingUp}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">月平均利润率</p>
              <p className="text-2xl font-bold text-gray-900">{stats.monthlyProfitRate || "0.00"}%</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <span className="text-lg">{EmojiIcons.DollarSign}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">月销售数量</p>
              <p className="text-2xl font-bold text-gray-900">{stats.monthlySoldCount || 0}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <span className="text-lg">{EmojiIcons.TrendingUp}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 操作按钮和筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* 左侧操作按钮 */}
          <div className="flex flex-wrap gap-3">
            <TransactionModal />
            <Button variant="outline" className="gap-2">
              <span className="text-lg">{EmojiIcons.Upload}</span>
              批量导入
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setExportDialogOpen(true)}
              className="gap-2"
            >
              <span className="text-lg">{EmojiIcons.Download}</span>
              导出数据
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/warehouse'}
              className="gap-2"
            >
              <span className="text-lg">{EmojiIcons.Warehouse}</span>
              仓库管理
            </Button>
            <Button variant="outline" onClick={() => setRefreshFlag((f) => f + 1)} className="gap-2">
              <span className="text-lg">{EmojiIcons.RefreshCw}</span>
              刷新
            </Button>
          </div>

          {/* 右侧筛选和搜索 */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <span className="text-lg">{EmojiIcons.Search}</span>
              <Input
                placeholder="搜索商品..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <span className="text-lg">{EmojiIcons.Filter}</span>
                  筛选
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setStatus("all")}>
                  全部状态
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatus("pending")}>
                  进行中
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatus("completed")}>
                  已完成
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatus("cancelled")}>
                  已取消
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 月份信息 */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
          <span className="text-lg">{EmojiIcons.Calendar}</span>
          <span className="text-sm text-gray-600">
            当前查看：{formatMonthDisplay(monthData.month)} 
            ({getMonthDateRange(monthData.month).start} 至 {getMonthDateRange(monthData.month).end})
          </span>
        </div>

        {/* 月度统计概览 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-lg">{EmojiIcons.TrendingUp}</span>
            {formatMonthDisplay(monthData.month)} 月度分析
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600 mb-1">
                {items.filter(item => {
                  const transaction = item.transactions?.[0];
                  if (!transaction?.purchaseDate) return false;
                  const purchaseDate = new Date(transaction.purchaseDate);
                  const monthStart = new Date(monthData.month + '-01');
                  const monthEnd = new Date(monthData.month + '-31');
                  return purchaseDate >= monthStart && purchaseDate <= monthEnd;
                }).length}
              </div>
              <div className="text-xs text-gray-600">购入商品</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-green-600 mb-1">
                {items.filter(item => {
                  const transaction = item.transactions?.[0];
                  if (!transaction?.soldDate) return false;
                  const soldDate = new Date(transaction.soldDate);
                  const monthStart = new Date(monthData.month + '-01');
                  const monthEnd = new Date(monthData.month + '-31');
                  return soldDate >= monthStart && soldDate <= monthEnd;
                }).length}
              </div>
              <div className="text-xs text-gray-600">销售商品</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600 mb-1">
                {formatCNY(items.filter(item => {
                  const transaction = item.transactions?.[0];
                  if (!transaction?.purchaseDate) return false;
                  const purchaseDate = new Date(transaction.purchaseDate);
                  const monthStart = new Date(monthData.month + '-01');
                  const monthEnd = new Date(monthData.month + '-31');
                  return purchaseDate >= monthStart && purchaseDate <= monthEnd;
                }).reduce((sum, item) => {
                  const transaction = item.transactions?.[0];
                  return sum + convertToCNY(
                    transaction?.purchasePrice || '0',
                    transaction?.purchasePriceCurrency || 'CNY',
                    transaction?.purchasePriceExchangeRate || '1'
                  );
                }, 0))}
              </div>
              <div className="text-xs text-gray-600">购入金额</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600 mb-1">
                {formatCNY(items.filter(item => {
                  const transaction = item.transactions?.[0];
                  if (!transaction?.soldDate) return false;
                  const soldDate = new Date(transaction.soldDate);
                  const monthStart = new Date(monthData.month + '-01');
                  const monthEnd = new Date(monthData.month + '-31');
                  return soldDate >= monthStart && soldDate <= monthEnd;
                }).reduce((sum, item) => {
                  const transaction = item.transactions?.[0];
                  return sum + convertToCNY(
                    transaction?.soldPrice || '0',
                    transaction?.soldPriceCurrency || 'CNY',
                    transaction?.soldPriceExchangeRate || '1'
                  );
                }, 0))}
              </div>
              <div className="text-xs text-gray-600">销售金额</div>
            </div>
          </div>
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
                        <ChevronUp className="w-4 h-4" />
                      ) : dateSort === "desc" ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronUp className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{EmojiIcons.Clock}</span>
                    在库时长
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{EmojiIcons.Tag}</span>
                    尺寸
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{EmojiIcons.Eye}</span>
                    状态
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{EmojiIcons.DollarSign}</span>
                    购入价格
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{EmojiIcons.ShoppingCart}</span>
                    购入平台
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
                      <span className="text-lg">{EmojiIcons.RefreshCw}</span>
                      加载中...
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <span className="text-lg">{EmojiIcons.Package}</span>
                      <p className="text-lg font-medium">{formatMonthDisplay(monthData.month)}暂无商品数据</p>
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
                toast({ 
                  title: "商品信息已成功更新！",
                  description: "商品信息已保存到数据库"
                });
              }}
            />
          )}
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