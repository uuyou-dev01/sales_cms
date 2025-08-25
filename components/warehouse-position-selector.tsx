"use client";
import * as React from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface WarehousePositionSelectorProps {
  selectedWarehouseId: string;
  selectedPositionId: string;
  onWarehouseChange: (warehouseId: string) => void;
  onPositionChange: (positionId: string) => void;
  className?: string;
}

export function WarehousePositionSelector({
  selectedWarehouseId,
  selectedPositionId,
  onWarehouseChange,
  onPositionChange,
  className = "",
}: WarehousePositionSelectorProps) {
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

  console.log("选择器状态:", {
    selectedWarehouseId,
    selectedPositionId,
    warehousesCount: warehouses.length,
    selectedWarehouse: selectedWarehouse?.name,
    selectedPosition: selectedPosition?.name
  });

  // 处理仓库选择
  const handleWarehouseChange = (warehouseId: string) => {
    console.log("选择仓库:", warehouseId);
    onWarehouseChange(warehouseId);
    onPositionChange(""); // 清空仓位选择
  };

  // 处理仓位选择
  const handlePositionChange = (positionId: string) => {
    console.log("选择仓位:", positionId);
    onPositionChange(positionId);
  };

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

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 仓库选择 */}
      <div>
        <Label htmlFor="warehouse-select">选择仓库</Label>
        <Select
          value={selectedWarehouseId || undefined}
          onValueChange={handleWarehouseChange}
        >
          <SelectTrigger id="warehouse-select">
            <SelectValue placeholder="请选择仓库" />
          </SelectTrigger>
          <SelectContent>
            {loading ? (
              <SelectItem value="loading" disabled>
                <div className="flex items-center gap-2">
                  <span className="text-lg">⏳</span>
                  加载中...
                </div>
              </SelectItem>
            ) : warehouses.length === 0 ? (
              <SelectItem value="no-warehouses" disabled>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏭</span>
                  暂无仓库
                </div>
              </SelectItem>
            ) : (
              warehouses.map((warehouse) => (
                <SelectItem key={warehouse.id} value={warehouse.id}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏢</span>
                    <span className="font-medium">{warehouse.name}</span>
                    {warehouse.description && (
                      <span className="text-xs text-gray-500">
                        ({warehouse.description})
                      </span>
                    )}
                    <span className="text-xs text-blue-500">
                      {warehouse.positions?.length || 0} 个仓位
                    </span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* 仓位选择 */}
      {selectedWarehouse && (
        <div>
          <Label htmlFor="position-select">选择仓位</Label>
          <div className="text-xs text-gray-500 mb-2">
            仓库: {selectedWarehouse.name} | 仓位数量: {selectedWarehouse.positions?.length || 0}
          </div>
          <Select
            value={selectedPositionId || undefined}
            onValueChange={handlePositionChange}
          >
            <SelectTrigger id="position-select">
              <SelectValue placeholder="请选择仓位" />
            </SelectTrigger>
            <SelectContent>
              {!selectedWarehouse.positions || selectedWarehouse.positions.length === 0 ? (
                <SelectItem value="no-positions" disabled>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📍</span>
                    该仓库暂无仓位
                  </div>
                </SelectItem>
              ) : (
                selectedWarehouse.positions.map((position) => {
                  const isFull = position.used >= position.capacity;
                  const remaining = position.capacity - position.used;
                  const usagePercent = Math.round((position.used / position.capacity) * 100);
                  
                  return (
                    <SelectItem 
                      key={position.id} 
                      value={position.id}
                      disabled={isFull}
                    >
                      <div className="flex items-center justify-between w-full min-w-[400px]">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-lg">📍</span>
                          <div>
                            <div className="font-medium">{position.name}</div>
                            <div className="text-xs text-gray-500">
                              位置: {selectedWarehouse.name} → {position.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              容量: {position.capacity} | 已用: {position.used} | 剩余: {remaining}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            isFull ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                          }`}>
                            {usagePercent}%
                          </span>
                          <span className={`text-xs px-2 py-1 rounded border ${
                            isFull ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'
                          }`}>
                            {position.used}/{position.capacity}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 当前选择显示 */}
      {(selectedWarehouse || selectedPosition) && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-800">
            <div className="font-medium">当前选择:</div>
            {selectedWarehouse && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg">🏢</span>
                <span>仓库: {selectedWarehouse.name}</span>
                {selectedWarehouse.description && (
                  <span className="text-xs text-gray-600">
                    ({selectedWarehouse.description})
                  </span>
                )}
              </div>
            )}
            {selectedPosition && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg">📍</span>
                <span>仓位: {selectedPosition.name}</span>
                <div className="text-xs text-gray-600 ml-2">
                  <span className="font-medium">使用情况:</span>
                  <span className={`ml-1 px-2 py-1 rounded ${
                    selectedPosition.used >= selectedPosition.capacity 
                      ? 'bg-red-100 text-red-600' 
                      : 'bg-green-100 text-green-600'
                  }`}>
                    {selectedPosition.used}/{selectedPosition.capacity}
                  </span>
                  <span className="ml-2">
                    剩余: {selectedPosition.capacity - selectedPosition.used}
                  </span>
                </div>
              </div>
            )}
            
            {/* 完整位置描述 */}
            {selectedWarehouse && selectedPosition && (
              <div className="mt-2 p-2 bg-white rounded border border-blue-200">
                <div className="text-xs text-blue-700 font-medium">
                  完整位置: {selectedWarehouse.name} → {selectedPosition.name}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  容量: {selectedPosition.capacity} | 已用: {selectedPosition.used} | 
                  剩余: {selectedPosition.capacity - selectedPosition.used} | 
                  使用率: {Math.round((selectedPosition.used / selectedPosition.capacity) * 100)}%
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
