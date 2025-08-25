"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { EmojiIcons } from "@/components/emoji-icons";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { STATUS_CONFIG, TRANSACTION_STATUSES } from "@/lib/constants";

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

interface ItemsTableProps {
  items: Item[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  dateSort: "asc" | "desc" | null;
  durationSort: "asc" | "desc" | null;
  priceSort: "asc" | "desc" | null;
  sizeFilter: string;
  platformFilter: string;
  searchQuery: string;
  onPageChange: (page: number) => void;
  onDateSortChange: (sort: "asc" | "desc" | null) => void;
  onDurationSortChange: (sort: "asc" | "desc" | null) => void;
  onPriceSortChange: (sort: "asc" | "desc" | null) => void;
  onSizeFilterChange: (filter: string) => void;
  onPlatformFilterChange: (filter: string) => void;
  onSearchQueryChange: (query: string) => void;
  onStatusChange: (itemId: string, newStatus: string) => void;
  onRemarksEdit: (itemId: string, currentRemarks: string) => void;
  onEditItem: (item: Item) => void;
  onCopyItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
}

export function ItemsTable({
  items,
  loading,
  page,
  pageSize,
  total,
  dateSort,
  durationSort,
  priceSort,
  sizeFilter,
  platformFilter,
  searchQuery,
  onPageChange,
  onDateSortChange,
  onDurationSortChange,
  onPriceSortChange,
  onSizeFilterChange,
  onPlatformFilterChange,
  onSearchQueryChange,
  onStatusChange,
  onRemarksEdit,
  onEditItem,
  onCopyItem,
  onDeleteItem,
}: ItemsTableProps) {
  return (
    <div className="space-y-6">
      {/* 操作按钮和筛选区域 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">🔍</span>
            <Input
              placeholder="搜索商品..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
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
              <DropdownMenuItem onClick={() => onStatusChange("", "all")}>全部状态</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange("", TRANSACTION_STATUSES.IN_TRANSIT_DOMESTIC)}>在途（国内）</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange("", TRANSACTION_STATUSES.IN_TRANSIT_JAPAN)}>在途（日本）</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange("", TRANSACTION_STATUSES.NOT_LISTED)}>未上架</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange("", TRANSACTION_STATUSES.LISTED)}>已上架</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange("", TRANSACTION_STATUSES.IN_TRANSACTION)}>交易中</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange("", TRANSACTION_STATUSES.RETURNING)}>退货中</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange("", TRANSACTION_STATUSES.COMPLETED)}>已完成</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Input
            type="date"
            className="w-32"
          />
          
          <Input
            type="date"
            className="w-32"
          />
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
                      onClick={() => onDateSortChange(dateSort === "asc" ? "desc" : "asc")}
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
                      onClick={() => onDurationSortChange(durationSort === "asc" ? "desc" : "asc")}
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
                        <DropdownMenuItem onClick={() => onSizeFilterChange("all")}>
                          全部尺寸
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSizeFilterChange("S")}>
                          S
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSizeFilterChange("M")}>
                          M
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSizeFilterChange("L")}>
                          L
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSizeFilterChange("XL")}>
                          XL
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSizeFilterChange("40")}>
                          40
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSizeFilterChange("41")}>
                          41
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSizeFilterChange("42")}>
                          42
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSizeFilterChange("43")}>
                          43
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSizeFilterChange("44")}>
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
                        <DropdownMenuItem onClick={() => onStatusChange("", "all")}>
                          全部状态
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onStatusChange("", TRANSACTION_STATUSES.IN_TRANSIT_DOMESTIC)}>
                          在途（国内）
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onStatusChange("", TRANSACTION_STATUSES.IN_TRANSIT_JAPAN)}>
                          在途（日本）
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onStatusChange("", TRANSACTION_STATUSES.NOT_LISTED)}>
                          未上架
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onStatusChange("", TRANSACTION_STATUSES.LISTED)}>
                          已上架
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onStatusChange("", TRANSACTION_STATUSES.IN_TRANSACTION)}>
                          交易中
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onStatusChange("", TRANSACTION_STATUSES.RETURNING)}>
                          退货中
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onStatusChange("", TRANSACTION_STATUSES.COMPLETED)}>
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
                      onClick={() => onPriceSortChange(priceSort === "asc" ? "desc" : "asc")}
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
                        <DropdownMenuItem onClick={() => onPlatformFilterChange("all")}>
                          全部平台
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onPlatformFilterChange("淘宝")}>
                          淘宝
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onPlatformFilterChange("闲鱼")}>
                          闲鱼
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onPlatformFilterChange("闲鱼")}>
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
                            <DropdownMenuItem onClick={() => onStatusChange(item.itemId, "在途（国内）")}>
                              在途（国内）
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onStatusChange(item.itemId, "在途（日本）")}>
                              在途（日本）
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onStatusChange(item.itemId, "未上架")}>
                              未上架
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onStatusChange(item.itemId, "已上架")}>
                              已上架
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onStatusChange(item.itemId, "交易中")}>
                              交易中
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onStatusChange(item.itemId, "退货中")}>
                              退货中
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onStatusChange(item.itemId, "已完成")}>
                              已完成
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onStatusChange(item.itemId, "已售出未结算")}>
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
                            onClick={() => onRemarksEdit(item.itemId, item.itemRemarks || "")}
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
                            <DropdownMenuItem onClick={() => onEditItem(item)} className="gap-2">
                              <span className="text-lg">{EmojiIcons.Edit}</span>
                              编辑商品
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => onCopyItem(item.itemId)}
                              className="gap-2"
                            >
                              📋 Copy出品
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => onDeleteItem(item.itemId)}
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
            onClick={() => onPageChange(page - 1)}
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
                    onClick={() => onPageChange(1)}
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
                    onClick={() => onPageChange(i)}
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
                    onClick={() => onPageChange(totalPages)}
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
            onClick={() => onPageChange(page + 1)}
          >
            下一页
          </Button>
        </div>
      </div>
    </div>
  );
}
