"use client";
import * as React from "react";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface WarehousePosition {
  id: string;
  name: string;
  capacity: number;
  used: number;
  warehouseId: string;
}

interface Warehouse {
  id: string;
  name: string;
  description?: string;
  positions: WarehousePosition[];
}

interface WarehousePositionCardsProps {
  selectedWarehouseId: string;
  selectedPositionId: string;
  onWarehouseChange: (warehouseId: string) => void;
  onPositionChange: (positionId: string) => void;
  className?: string;
}

export function WarehousePositionCards({
  selectedWarehouseId,
  selectedPositionId,
  onWarehouseChange,
  onPositionChange,
  className = "",
}: WarehousePositionCardsProps) {
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // 获取仓库数据
  React.useEffect(() => {
    setLoading(true);
    setError(null);
    
    console.log("开始获取仓库数据...");
    
    fetch("/api/warehouses")
      .then((res) => {
        console.log("API响应状态:", res.status, res.ok);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("API返回数据:", data);
        
        if (Array.isArray(data)) {
          console.log("成功获取仓库数据，数量:", data.length);
          setWarehouses(data);
          setError(null);
        } else {
          throw new Error("API返回数据格式错误");
        }
      })
      .catch((error) => {
        console.error("获取仓库数据失败:", error);
        setError(error.message || "获取仓库数据失败");
        setWarehouses([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // 获取当前选中的仓库
  const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId);
  
  // 获取当前选中的仓位
  const selectedPosition = selectedWarehouse?.positions.find(p => p.id === selectedPositionId);

  console.log("卡片选择器状态:", {
    selectedWarehouseId,
    selectedPositionId,
    warehousesCount: warehouses.length,
    selectedWarehouse: selectedWarehouse?.name,
    selectedPosition: selectedPosition?.name
  });

  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="text-sm font-medium text-red-800">无法加载仓库数据</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-lg">⏳</span>
            <span className="text-sm text-blue-800">正在加载仓库数据...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 仓库选择 */}
      <div>
        <Label className="text-base font-medium mb-3 block">选择仓库</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map((warehouse) => {
            const isSelected = warehouse.id === selectedWarehouseId;
            const positionsCount = warehouse.positions?.length || 0;
            
            return (
              <Card 
                key={warehouse.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isSelected 
                    ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-300' 
                    : 'hover:border-gray-300'
                }`}
                onClick={() => {
                  console.log("点击仓库卡片:", warehouse.id);
                  onWarehouseChange(warehouse.id);
                }}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="text-lg">🏢</span>
                    {warehouse.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {warehouse.description && (
                    <p className="text-sm text-gray-600 mb-2">
                      {warehouse.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {positionsCount} 个仓位
                    </Badge>
                    {isSelected && (
                      <Badge className="bg-blue-500 text-white text-xs">
                        已选择
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 仓位选择 */}
      {selectedWarehouse && (
        <div>
          <Label className="text-base font-medium mb-3 block">
            选择仓位 - {selectedWarehouse.name}
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedWarehouse.positions && selectedWarehouse.positions.length > 0 ? (
              selectedWarehouse.positions.map((position) => {
                const isSelected = position.id === selectedPositionId;
                const isFull = position.used >= position.capacity;
                const remaining = position.capacity - position.used;
                const usagePercent = Math.round((position.used / position.capacity) * 100);
                
                return (
                  <Card 
                    key={position.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected 
                        ? 'ring-2 ring-green-500 bg-green-50 border-green-300' 
                        : isFull
                        ? 'opacity-60 cursor-not-allowed'
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => {
                      if (!isFull) {
                        console.log("点击仓位卡片:", position.id);
                        onPositionChange(position.id);
                      }
                    }}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <span className="text-lg">📍</span>
                        {position.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600">
                          <div>位置: {selectedWarehouse.name} → {position.name}</div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span>容量:</span>
                            <span className="font-medium">{position.capacity}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span>已用:</span>
                            <span className="font-medium">{position.used}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span>剩余:</span>
                            <span className={`font-medium ${
                              remaining > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {remaining}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              isFull 
                                ? 'bg-red-100 text-red-600 border-red-200' 
                                : 'bg-green-100 text-green-600 border-green-200'
                            }`}
                          >
                            {usagePercent}%
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              isFull 
                                ? 'bg-red-100 text-red-600 border-red-200' 
                                : 'bg-green-100 text-green-600 border-green-200'
                            }`}
                          >
                            {position.used}/{position.capacity}
                          </Badge>
                        </div>
                        
                        {isSelected && (
                          <Badge className="bg-green-500 text-white text-xs w-full">
                            已选择
                          </Badge>
                        )}
                        
                        {isFull && (
                          <Badge variant="outline" className="bg-red-100 text-red-600 border-red-200 text-xs w-full">
                            仓位已满
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-full">
                <Card className="border-dashed border-gray-300 bg-gray-50">
                  <CardContent className="p-6 text-center">
                    <span className="text-lg">📍</span>
                    <p className="text-sm text-gray-600 mt-2">
                      该仓库暂无仓位
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 当前选择显示 */}
      {(selectedWarehouse || selectedPosition) && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base text-blue-800">当前选择</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedWarehouse && (
              <div className="flex items-center gap-2">
                <span className="text-lg">🏢</span>
                <div>
                  <div className="font-medium">仓库: {selectedWarehouse.name}</div>
                  {selectedWarehouse.description && (
                    <div className="text-sm text-gray-600">
                      {selectedWarehouse.description}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {selectedPosition && (
              <div className="flex items-center gap-2">
                <span className="text-lg">📍</span>
                <div>
                  <div className="font-medium">仓位: {selectedPosition.name}</div>
                  <div className="text-sm text-gray-600">
                    完整位置: {selectedWarehouse?.name} → {selectedPosition.name}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    容量: {selectedPosition.capacity} | 已用: {selectedPosition.used} | 
                    剩余: {selectedPosition.capacity - selectedPosition.used} | 
                    使用率: {Math.round((selectedPosition.used / selectedPosition.capacity) * 100)}%
                  </div>
                </div>
              </div>
            )}
            
            <div className="pt-2 border-t border-blue-200">
              <div className="text-xs text-blue-700 font-medium">
                数据库字段值: {selectedPositionId || "未选择仓位"}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                说明: warehousePositionId 字段直接存储仓位的ID，不是组合值
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
