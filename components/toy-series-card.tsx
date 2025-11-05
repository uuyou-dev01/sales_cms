"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmojiIcons } from "@/components/emoji-icons";
import { Edit, Package, ShoppingCart, TrendingDown, Info, Plus, Trash2 } from "lucide-react";
import { ToySKUDetailDialog } from "./toys/toy-sku-detail-dialog";
import { ToyInventoryAdjustDialog } from "./toys/toy-inventory-adjust-dialog";
import { ToyPurchaseDialog } from "./toys/toy-purchase-dialog";
import { ToySalesDialog } from "./toys/toy-sales-dialog";
import { ToyInTransitDialog } from "./toys/toy-in-transit-dialog";
import { ToySKUCreateDialog } from "./toys/toy-sku-create-dialog";
import { ToySKU, ToyPurchaseOrder, ToyInventoryBatch, ToySalesRecord } from "@/lib/toy-types";

interface ToySeriesCardProps {
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
  // 新增的管理功能相关属性
  skus?: ToySKU[];
  purchaseOrders?: ToyPurchaseOrder[];
  salesRecords?: ToySalesRecord[];
  onSeriesUpdate?: (seriesId: string, updatedData: {
    skuId?: string;
    updatedSKU?: ToySKU;
    newPurchase?: ToyPurchaseOrder;
    newStock?: number;
    updatedBatches?: ToyInventoryBatch[];
    newSalesRecord?: ToySalesRecord;
    newSku?: ToySKU;
    updatedSeries?: { name: string; description: string; image: string };
    deleted?: boolean;
  }) => void;
}

export function ToySeriesCard({
  seriesId,
  seriesName,
  brandName,
  seriesImage,
  description,
  totalItems,
  inStockCount,
  soldCount,
  totalProfit,
  averageProfitRate,
  characters,
  oldestPurchaseDate,
  skus = [],
  purchaseOrders = [],
  salesRecords = [],
  onSeriesUpdate,
}: ToySeriesCardProps) {
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [selectedSku, setSelectedSku] = React.useState<ToySKU | null>(null);
  const [dialogType, setDialogType] = React.useState<"adjust" | "purchase" | "sales" | "transit" | "detail" | "create-sku" | "edit-series" | null>(null);
  
  // 编辑系列状态
  const [isEditingSeries, setIsEditingSeries] = React.useState(false);
  const [editFormData, setEditFormData] = React.useState({
    name: seriesName,
    description: description || "",
    image: seriesImage || "",
  });

  // 计算存储天数
  const storageDays = oldestPurchaseDate 
    ? Math.floor((new Date().getTime() - new Date(oldestPurchaseDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // 获取SKU的在途订单
  const getSkuInTransitOrders = (skuId: string): ToyPurchaseOrder[] => {
    return purchaseOrders.filter(order => order.skuId === skuId && order.status !== "JAPAN_ARRIVED");
  };

  // 处理库存更新
  const handleStockUpdate = (newStock: number) => {
    if (!selectedSku || !onSeriesUpdate) return;
    
    const updatedSKU = { ...selectedSku, currentStock: newStock };
    onSeriesUpdate(seriesId, { skuId: selectedSku.id, updatedSKU });
    setDialogType(null);
  };

  // 处理采购保存
  const handlePurchaseSave = (purchase: ToyPurchaseOrder) => {
    if (!onSeriesUpdate) return;
    
    onSeriesUpdate(seriesId, { newPurchase: purchase });
    setDialogType(null);
  };

  // 处理销售保存
  const handleSalesSave = (quantity: number, amount: number, updatedBatches: ToyInventoryBatch[], cost: number, profit: number) => {
    if (!selectedSku || !onSeriesUpdate) return;

    const newSalesRecord: ToySalesRecord = {
      id: Date.now().toString(),
      skuId: selectedSku.id,
      date: new Date().toISOString(),
      amount,
      quantity,
      cost,
      profit,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSeriesUpdate(seriesId, { 
      skuId: selectedSku.id, 
      newStock: selectedSku.currentStock - quantity,
      updatedBatches,
      newSalesRecord 
    });
    setDialogType(null);
  };

  // 处理编辑系列
  const handleEditSeries = async () => {
    if (!editFormData.name.trim()) {
      alert("系列名称不能为空");
      return;
    }

    try {
      const response = await fetch(`/api/toys/series/${seriesId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editFormData.name.trim(),
          description: editFormData.description,
          image: editFormData.image,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        if (onSeriesUpdate) {
          onSeriesUpdate(seriesId, { 
            updatedSeries: {
              name: editFormData.name,
              description: editFormData.description,
              image: editFormData.image,
            }
          });
        }
        setIsEditingSeries(false);
        setDialogType(null);
        alert("系列更新成功");
      } else {
        throw new Error(data.message || "更新失败");
      }
    } catch (error) {
      console.error("更新系列失败:", error);
      alert(error instanceof Error ? error.message : "更新失败，请重试");
    }
  };

  // 处理图片上传
  const handleImageUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        setEditFormData(prev => ({ ...prev, image: data.url }));
      } else {
        throw new Error(data.message || "图片上传失败");
      }
    } catch (error) {
      console.error("图片上传失败:", error);
      alert(error instanceof Error ? error.message : "图片上传失败，请重试");
    }
  };

  // 处理删除系列
  const handleDeleteSeries = async () => {
    if (!confirm(`确定要删除系列"${seriesName}"吗？这将删除该系列下的所有SKU数据！`)) {
      return;
    }

    try {
      const response = await fetch(`/api/toys/series/${seriesId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        if (onSeriesUpdate) {
          onSeriesUpdate(seriesId, { deleted: true });
        }
        setIsDetailOpen(false);
      } else {
        throw new Error(data.message || "删除失败");
      }
    } catch (error) {
      console.error("删除系列失败:", error);
      alert(error instanceof Error ? error.message : "删除失败，请重试");
    }
  };

  // 处理SKU创建
  const handleSKUCreate = (newSku: ToySKU) => {
    if (!onSeriesUpdate) return;
    
    onSeriesUpdate(seriesId, { newSku });
    setDialogType(null);
  };

  // 获取利润率颜色
  const getProfitColor = (rate: number) => {
    if (rate > 30) return "text-green-600";
    if (rate > 15) return "text-blue-600";
    if (rate > 0) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <>
      <Card 
        className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-orange-200 bg-gradient-to-br from-orange-50 to-pink-50"
        onClick={() => setIsDetailOpen(true)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                {brandName} {seriesName}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  🧸 潮玩系列
                </Badge>
                <span className="text-sm text-gray-600">{totalItems}件</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-200 to-pink-200 rounded-lg flex items-center justify-center">
                {seriesImage ? (
                  <img src={seriesImage} alt={seriesName} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <span className="text-2xl">🎭</span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* 品牌和描述 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">品牌:</span>
              <span className="font-medium text-gray-900">{brandName}</span>
            </div>
            {description && (
              <div className="text-xs text-gray-500 line-clamp-2">{description}</div>
            )}
          </div>

          {/* 款式统计 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">可选款式:</span>
              <div className="flex flex-wrap gap-1">
                {characters.slice(0, 3).map((char, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {char.characterName}
                    {char.variant !== "正常款" && ` (${char.variant})`}
                    <span className="ml-1 text-blue-600">({char.count})</span>
                  </Badge>
                ))}
                {characters.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{characters.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* 库存状态 */}
          <div className="text-sm">
            <div className="text-gray-600 mb-2">库存状态:</div>
            <div className="flex items-center gap-4">
              <span className="text-green-600">在库 {inStockCount}</span>
              <span className="text-blue-600">已售 {soldCount}</span>
              <span className="text-orange-600">在途 {purchaseOrders.filter(p => p.status !== "JAPAN_ARRIVED").reduce((sum, p) => sum + p.quantity, 0)}</span>
            </div>
          </div>

          {/* 利润信息 */}
          {totalProfit > 0 && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-600">总利润:</div>
                <div className={`font-semibold ${getProfitColor(averageProfitRate)}`}>
                  ¥{totalProfit.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-gray-600">利润率:</div>
                <div className={`font-semibold ${getProfitColor(averageProfitRate)}`}>
                  {Number(averageProfitRate).toFixed(1)}%
                </div>
              </div>
            </div>
          )}

          {/* 存储时间 */}
          {storageDays > 0 && (
            <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1 text-gray-600">
                <span>{EmojiIcons.Clock}</span>
                <span>存储时间</span>
              </div>
              <span className="font-medium text-gray-900">{storageDays}天</span>
            </div>
          )}

        </CardContent>
      </Card>

      {/* 详情对话框 */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{brandName} {seriesName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* 库存管理部分 */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">库存管理</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDialogType("create-sku")}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    新增SKU
                  </Button>
                  {onSeriesUpdate && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDialogType("edit-series")}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        编辑系列
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteSeries}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        删除系列
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {skus.length > 0 ? (
                <div className="space-y-3">
                  {skus.map((sku) => {
                    const inTransit = getSkuInTransitOrders(sku.id).reduce(
                      (sum, order) => sum + order.quantity,
                      0
                    );
                    return (
                      <div
                        key={sku.id}
                        className="p-3 bg-gray-50 rounded-lg space-y-2"
                      >
                        <div className="flex items-center gap-4">
                          <img
                            src={sku.image || "https://images.unsplash.com/photo-1604257206125-c0d204cb1493?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibGluZCUyMGJveCUyMHRveXxlbnwxfHx8fDE3NjEyMzYzNDh8MA&ixlib=rb-4.1.0&q=80&w=1080"}
                            alt={sku.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{sku.name}</span>
                              <span className="text-sm text-gray-500">¥{Number(sku.suggestedPrice).toFixed(2)}</span>
                              {inTransit > 0 && (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs cursor-pointer hover:bg-blue-100 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSku(sku);
                                    setDialogType("transit");
                                  }}
                                >
                                  在途: {inTransit}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="text-green-600">在库：{sku.currentStock}</span>
                              <span className="text-blue-600">已售：{salesRecords.filter(r => r.skuId === sku.id).reduce((sum, r) => sum + r.quantity, 0)}</span>
                              <span className="text-orange-600">在途：{inTransit}</span>
                              <span className="text-gray-500">成本：¥{Number(sku.costPrice).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedSku(sku);
                              setDialogType("adjust");
                            }}
                          >
                            调整库存
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedSku(sku);
                              setDialogType("sales");
                            }}
                          >
                            <ShoppingCart className="w-4 h-4 mr-1" />
                            销售
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedSku(sku);
                              setDialogType("purchase");
                            }}
                          >
                            <TrendingDown className="w-4 h-4 mr-1" />
                            采购
                          </Button>
                          {inTransit > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => {
                                setSelectedSku(sku);
                                setDialogType("transit");
                              }}
                            >
                              <Package className="w-4 h-4 mr-1" />
                              查看在途
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            onClick={() => {
                              setSelectedSku(sku);
                              setDialogType("detail");
                            }}
                          >
                            <Info className="w-4 h-4 mr-1" />
                            详情
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>暂无SKU，点击上方按钮添加</p>
                </div>
              )}
            </div>

            {/* 销售数据部分 */}
            <div>
              <h3 className="mb-4 text-lg font-semibold">销售数据</h3>
              <div className="space-y-2">
                {salesRecords.length > 0 ? (
                  salesRecords
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 10)
                    .map((record) => (
                      <div
                        key={record.id}
                        className="p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-4">
                            <span className="text-blue-900 font-medium">
                              {skus.find(sku => sku.id === record.skuId)?.name || "未知SKU"}
                            </span>
                            <span className="text-sm text-gray-600">
                              {new Date(record.date).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                          <span className="text-sm text-gray-600">{record.quantity} 件</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-gray-500">销售额</p>
                            <p className="text-blue-900">¥{Number(record.amount).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">成本</p>
                            <p className="text-orange-700">¥{Number(record.cost).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">利润</p>
                            <p className={record.profit >= 0 ? "text-green-700" : "text-red-600"}>
                              ¥{Number(record.profit).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-gray-500 p-3">暂无销售数据</p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 调整库存对话框 */}
      {selectedSku && dialogType === "adjust" && (
        <ToyInventoryAdjustDialog
          isOpen={true}
          onClose={() => setDialogType(null)}
          skuName={selectedSku.name}
          currentStock={selectedSku.currentStock}
          inTransitOrders={getSkuInTransitOrders(selectedSku.id)}
          onSave={handleStockUpdate}
          onViewInTransit={() => setDialogType("transit")}
        />
      )}

      {/* 采购对话框 */}
      {selectedSku && dialogType === "purchase" && (
        <ToyPurchaseDialog
          isOpen={true}
          onClose={() => setDialogType(null)}
          skuId={selectedSku.id}
          skuName={selectedSku.name}
          onSave={handlePurchaseSave}
        />
      )}

      {/* 销售对话框 */}
      {selectedSku && dialogType === "sales" && (
        <ToySalesDialog
          isOpen={true}
          onClose={() => setDialogType(null)}
          skuName={selectedSku.name}
          skuPrice={selectedSku.suggestedPrice}
          currentStock={selectedSku.currentStock}
          batches={selectedSku.inventoryBatches || []}
          onSave={handleSalesSave}
        />
      )}

      {/* 在途详情对话框 */}
      {selectedSku && dialogType === "transit" && (
        <ToyInTransitDialog
          isOpen={true}
          onClose={() => setDialogType(null)}
          skuName={selectedSku.name}
          purchaseOrders={getSkuInTransitOrders(selectedSku.id)}
          onCompleteBatchInbound={() => {}}
          onShipUnassignedBatch={() => {}}
        />
      )}

      {/* 编辑系列对话框 */}
      {dialogType === "edit-series" && (
        <Dialog open={true} onOpenChange={() => setDialogType(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>编辑系列 - {seriesName}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">系列名称 *</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：迪士尼family系列"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">系列描述</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="例如：迪士尼经典角色系列"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">系列图片</label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                    className="hidden"
                    id="series-image-upload"
                  />
                  <label
                    htmlFor="series-image-upload"
                    className="cursor-pointer flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50"
                  >
                    <Edit className="w-4 h-4" />
                    上传图片
                  </label>
                  {editFormData.image && (
                    <img
                      src={editFormData.image}
                      alt="系列图片"
                      className="w-20 h-20 object-cover rounded-md"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setDialogType(null)}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                onClick={handleEditSeries}
                className="flex-1"
              >
                保存更改
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* SKU创建对话框 */}
      {dialogType === "create-sku" && (
        <ToySKUCreateDialog
          isOpen={true}
          onClose={() => setDialogType(null)}
          seriesId={seriesId}
          seriesName={seriesName}
          characters={characters}
          skus={skus}
          onSave={handleSKUCreate}
        />
      )}

      {/* SKU详情对话框 */}
      {selectedSku && dialogType === "detail" && (
        <ToySKUDetailDialog
          isOpen={true}
          onClose={() => setDialogType(null)}
          sku={selectedSku}
          purchaseOrders={selectedSku.purchaseOrders || []}
          salesRecords={salesRecords.filter(r => r.skuId === selectedSku.id)}
        />
      )}
    </>
  );
}
