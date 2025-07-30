"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { TransactionForm } from "@/components/add-new-items";
import TransactionModal from "@/components/add-new-items";
import { SafeDialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/safe-dialog";
import { ChevronUp, ChevronDown, MoreHorizontal, Search, Filter, Upload, Download, TrendingUp, Package, DollarSign, ShoppingCart, Clock, Calendar, Tag, Eye, Edit, Trash2, RefreshCw, ArrowLeft } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

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
  itemStatus: string;
  itemBrand?: string;
  itemType?: string;
  itemCondition?: string;
  itemColor?: string;
  itemRemarks?: string;
  transactions?: Array<{
    purchaseDate: string;
    purchaseAmount: string;
    soldPrice?: string;
    itemNetProfit?: string;
    itemGrossProfit?: string;
    purchasePlatform?: string;
  }>;
}

// 数据转换函数：将API数据转换为TransactionForm需要的格式
const convertItemToFormData = (item: Item) => {
  const transaction = item.transactions?.[0];
  return {
    // Item 表字段
    itemId: item.itemId,
    itemName: item.itemName,
    itemMfgDate: new Date(), // 默认值，实际应该从数据库获取
    itemNumber: "",
    itemType: item.itemType || "",
    itemBrand: item.itemBrand || "",
    itemCondition: item.itemCondition || "",
    itemRemarks: item.itemRemarks || "",
    itemColor: item.itemColor || "",
    itemStatus: item.itemStatus,
    itemSize: item.itemSize || "",
    position: "",
    photos: [],
    
    // Transaction 表字段
    shipping: "0",
    transactionStatues: item.itemStatus,
    purchaseDate: transaction?.purchaseDate ? new Date(transaction.purchaseDate) : new Date(),
    soldDate: null,
    purchaseAmount: transaction?.purchaseAmount || "0",
    launchDate: null,
    purchasePlatform: transaction?.purchasePlatform || "",
    soldPlatform: "",
    purchasePrice: transaction?.purchaseAmount || "0",
    purchasePriceCurrency: "CNY",
    purchasePriceExchangeRate: "1",
    soldPrice: transaction?.soldPrice || "0",
    soldPriceCurrency: "CNY",
    soldPriceExchangeRate: "1",
    itemGrossProfit: transaction?.itemGrossProfit || "0",
    itemNetProfit: transaction?.itemNetProfit || "0",
    isReturn: false,
    returnFee: "0",
    storageDuration: "0",
  };
};

export default function MonthPage({ params }: { params: Promise<{ month: string }> }) {
  const { toast } = useToast();
  const [items, setItems] = React.useState<Item[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState<string>("all");
  const [refreshFlag, setRefreshFlag] = React.useState(0);
  const [editItem, setEditItem] = React.useState<Item | null>(null);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [dateSort, setDateSort] = React.useState<"asc" | "desc" | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [monthData, setMonthData] = React.useState<{ month: string } | null>(null);

  // 解析月份参数
  React.useEffect(() => {
    params.then((data) => {
      setMonthData(data);
    });
  }, [params]);

  // 根据月份计算开始和结束日期
  const getMonthDateRange = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
  };

  // 格式化月份显示
  const formatMonthDisplay = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const monthNames = [
      "一月", "二月", "三月", "四月", "五月", "六月",
      "七月", "八月", "九月", "十月", "十一月", "十二月"
    ];
    return `${year}年${monthNames[parseInt(month) - 1]}`;
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
      })
      .catch(() => {
        toast({ title: "获取数据失败", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, status, searchQuery, refreshFlag, monthData, toast]);

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
    fetch(`/api/items/stats?start=${start}&end=${end}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          console.error("获取统计数据失败:", data.error);
        } else {
          setStats(data);
        }
      })
      .catch((error) => {
        console.error("获取统计数据失败:", error);
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
              <ArrowLeft className="w-4 h-4" />
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
              <p className="text-2xl font-bold text-gray-900">¥{stats.monthlyPurchase.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">销售金额</p>
              <p className="text-2xl font-bold text-gray-900">¥{stats.monthlySold.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">月平均利润率</p>
              <p className="text-2xl font-bold text-gray-900">{stats.monthlyProfitRate}%</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">月销售数量</p>
              <p className="text-2xl font-bold text-gray-900">{stats.monthlySoldCount}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
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
              <Upload className="w-4 h-4" />
              批量导入
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              导出数据
            </Button>
            <Button variant="outline" onClick={() => setRefreshFlag((f) => f + 1)} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              刷新
            </Button>
          </div>

          {/* 右侧筛选和搜索 */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
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
                  <Filter className="w-4 h-4" />
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
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">
            当前查看：{formatMonthDisplay(monthData.month)} 
            ({getMonthDateRange(monthData.month).start} 至 {getMonthDateRange(monthData.month).end})
          </span>
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
                    <Package className="w-4 h-4" />
                    商品信息
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
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
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    在库时长
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    尺寸
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    状态
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    购入价格
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    购入平台
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
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      加载中...
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
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
                        <StatusBadge status={item.itemStatus} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        ¥{t?.purchaseAmount ? parseFloat(t.purchaseAmount).toLocaleString() : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {t?.purchasePlatform || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
              setEditItem(item);
              setEditDialogOpen(true);
            }} className="gap-2">
                              <Edit className="w-4 h-4" />
                              编辑商品
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(item.itemId)}
                              className="text-red-600 gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
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
            {Array.from({ length: Math.min(5, Math.ceil(total / pageSize)) }, (_, i) => {
              const pageNum = i + 1;
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
            {Math.ceil(total / pageSize) > 5 && (
              <span className="px-2 text-gray-500">...</span>
            )}
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
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
              }}
            />
          )}
        </DialogContent>
      </SafeDialog>
    </>
  );
} 