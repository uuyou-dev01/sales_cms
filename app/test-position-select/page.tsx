"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-simple";

export default function TestPositionSelect() {
  const [warehouseId, setWarehouseId] = React.useState<string>("");
  const [positionId, setPositionId] = React.useState<string>("");

  // 模拟仓库数据
  const warehouses = [
    { id: "wh1", name: "主仓库", description: "主要存储仓库" },
    { id: "wh2", name: "备用仓库", description: "备用存储仓库" }
  ];

  // 模拟仓位数据 - 包含具体的容量和使用情况
  const positions = [
    { id: "pos1", name: "A区-01", capacity: 100, used: 30, warehouseId: "wh1" },
    { id: "pos2", name: "A区-02", capacity: 80, used: 75, warehouseId: "wh1" },
    { id: "pos3", name: "B区-01", capacity: 150, used: 120, warehouseId: "wh1" },
    { id: "pos4", name: "B区-02", capacity: 200, used: 180, warehouseId: "wh1" },
    { id: "pos5", name: "备用-01", capacity: 50, used: 10, warehouseId: "wh2" },
    { id: "pos6", name: "备用-02", capacity: 60, used: 0, warehouseId: "wh2" }
  ];

  const handleWarehouseChange = (value: string) => {
    console.log("=== 仓库选择事件 ===");
    console.log("选择的仓库ID:", value);
    console.log("选择的仓库名称:", warehouses.find(w => w.id === value)?.name);
    console.log("==================");
    
    setWarehouseId(value);
    setPositionId(""); // 清空仓位选择
  };

  const handlePositionChange = (value: string) => {
    console.log("=== 仓位选择事件 ===");
    console.log("选择的仓位ID:", value);
    const selectedPosition = positions.find(p => p.id === value);
    if (selectedPosition) {
      console.log("选择的仓位名称:", selectedPosition.name);
      console.log("仓位容量:", selectedPosition.capacity);
      console.log("已使用:", selectedPosition.used);
      console.log("剩余空间:", selectedPosition.capacity - selectedPosition.used);
      console.log("所属仓库:", warehouses.find(w => w.id === selectedPosition.warehouseId)?.name);
    }
    console.log("==================");
    
    setPositionId(value);
  };

  // 获取当前仓库的仓位
  const currentWarehousePositions = positions.filter(p => p.warehouseId === warehouseId);

  // 获取当前选择的仓位详情
  const selectedPosition = positions.find(p => p.id === positionId);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">仓位选择测试</h1>
      
      <div className="space-y-6">
        {/* 仓库选择 */}
        <div>
          <h2 className="text-lg font-semibold mb-2">第一步：选择仓库</h2>
          <Select value={warehouseId} onValueChange={handleWarehouseChange}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="请选择仓库..." />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((warehouse) => (
                <SelectItem key={warehouse.id} value={warehouse.id}>
                  <div className="flex items-center gap-2">
                    <span>🏢</span>
                    <span className="font-medium">{warehouse.name}</span>
                    <span className="text-xs text-gray-500">
                      ({warehouse.description})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-600 mt-1">
            当前选择: {warehouseId ? `${warehouses.find(w => w.id === warehouseId)?.name} (${warehouseId})` : "无"}
          </p>
        </div>

        {/* 仓位选择 */}
        {warehouseId && (
          <div>
            <h2 className="text-lg font-semibold mb-2">第二步：选择仓位</h2>
            <div className="text-xs text-gray-500 mb-2">
              仓库: {warehouses.find(w => w.id === warehouseId)?.name} | 
              可用仓位: {currentWarehousePositions.length} 个
            </div>
            <Select value={positionId} onValueChange={handlePositionChange}>
              <SelectTrigger className="w-[400px]">
                <SelectValue placeholder="请选择仓位..." />
              </SelectTrigger>
              <SelectContent>
                {currentWarehousePositions.length === 0 ? (
                  <SelectItem value="no-positions" disabled>
                    <div className="flex items-center gap-2">
                      <span>📍</span>
                      该仓库暂无仓位
                    </div>
                  </SelectItem>
                ) : (
                  currentWarehousePositions.map((position) => {
                    const isFull = position.used >= position.capacity;
                    const remaining = position.capacity - position.used;
                    const usagePercent = Math.round((position.used / position.capacity) * 100);
                    
                    return (
                      <SelectItem 
                        key={position.id} 
                        value={position.id}
                        disabled={isFull}
                      >
                        <div className="flex items-center justify-between w-full min-w-[350px]">
                          <div className="flex items-center gap-2 flex-1">
                            <span>📍</span>
                            <div>
                              <div className="font-medium">{position.name}</div>
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
            <p className="text-sm text-gray-600 mt-1">
              当前选择: {positionId ? `${selectedPosition?.name} (${positionId})` : "无"}
            </p>
          </div>
        )}

        {/* 当前选择状态 */}
        {(warehouseId || positionId) && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold mb-2">当前选择状态:</h3>
            <div className="space-y-1 text-sm">
              <p>仓库ID: {warehouseId || "未选择"}</p>
              <p>仓库名称: {warehouseId ? warehouses.find(w => w.id === warehouseId)?.name : "未选择"}</p>
              <p>仓位ID: {positionId || "未选择"}</p>
              <p>仓位名称: {selectedPosition?.name || "未选择"}</p>
              {selectedPosition && (
                <>
                  <p>仓位容量: {selectedPosition.capacity}</p>
                  <p>已使用: {selectedPosition.used}</p>
                  <p>剩余空间: {selectedPosition.capacity - selectedPosition.used}</p>
                  <p>使用率: {Math.round((selectedPosition.used / selectedPosition.capacity) * 100)}%</p>
                </>
              )}
              <p className="font-medium text-blue-800 mt-2">
                组合值: {warehouseId && positionId ? `${warehouseId}-${positionId}` : "未完整选择"}
              </p>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              console.log("=== 重置选择 ===");
              setWarehouseId("");
              setPositionId("");
            }}
            variant="outline"
          >
            重置选择
          </Button>
          
          <Button 
            onClick={() => {
              console.log("=== 模拟选择 ===");
              console.log("当前仓库ID:", warehouseId);
              console.log("当前仓位ID:", positionId);
              console.log("组合值:", warehouseId && positionId ? `${warehouseId}-${positionId}` : "未完整选择");
            }}
            variant="outline"
          >
            打印当前状态
          </Button>
        </div>
      </div>
    </div>
  );
}
