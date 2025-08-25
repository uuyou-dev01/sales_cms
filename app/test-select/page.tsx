"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TestSelect() {
  const [warehouseId, setWarehouseId] = React.useState<string>("");
  const [positionId, setPositionId] = React.useState<string>("");

  const warehouses = [
    { id: "wh1", name: "仓库A", description: "主仓库" },
    { id: "wh2", name: "仓库B", description: "备用仓库" }
  ];

  const positions = [
    { id: "pos1", name: "仓位1", capacity: 100, used: 30 },
    { id: "pos2", name: "仓位2", capacity: 50, used: 45 },
    { id: "pos3", name: "仓位3", capacity: 200, used: 180 }
  ];

  const handleWarehouseChange = (value: string) => {
    console.log("选择仓库:", value);
    setWarehouseId(value);
    setPositionId(""); // 清空仓位选择
  };

  const handlePositionChange = (value: string) => {
    console.log("选择仓位:", value);
    setPositionId(value);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Select组件测试</h1>
      
      <div className="space-y-6">
        {/* 仓库选择 */}
        <div>
          <h2 className="text-lg font-semibold mb-2">仓库选择</h2>
          <Select value={warehouseId} onValueChange={handleWarehouseChange}>
            <SelectTrigger>
              <SelectValue placeholder="请选择仓库" />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((warehouse) => (
                <SelectItem key={warehouse.id} value={warehouse.id}>
                  <div className="flex items-center gap-2">
                    <span>🏢</span>
                    <span>{warehouse.name}</span>
                    <span className="text-xs text-gray-500">
                      ({warehouse.description})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-600 mt-1">
            当前选择: {warehouseId || "无"}
          </p>
        </div>

        {/* 仓位选择 */}
        {warehouseId && (
          <div>
            <h2 className="text-lg font-semibold mb-2">仓位选择</h2>
            <Select value={positionId} onValueChange={handlePositionChange}>
              <SelectTrigger>
                <SelectValue placeholder="请选择仓位" />
              </SelectTrigger>
              <SelectContent>
                {positions.map((position) => {
                  const isFull = position.used >= position.capacity;
                  const remaining = position.capacity - position.used;
                  
                  return (
                    <SelectItem 
                      key={position.id} 
                      value={position.id}
                      disabled={isFull}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span>📍</span>
                          <div>
                            <div className="font-medium">{position.name}</div>
                            <div className="text-xs text-gray-500">
                              容量: {position.capacity} | 已用: {position.used} | 剩余: {remaining}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs">
                          <span className={`px-2 py-1 rounded ${
                            isFull ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                          }`}>
                            {position.used}/{position.capacity}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-600 mt-1">
              当前选择: {positionId || "无"}
            </p>
          </div>
        )}

        {/* 状态显示 */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold mb-2">当前状态:</h3>
          <div className="space-y-1 text-sm">
            <p>仓库ID: {warehouseId || "未选择"}</p>
            <p>仓位ID: {positionId || "未选择"}</p>
            <p>组合值: {warehouseId && positionId ? `${warehouseId}-${positionId}` : "未完整选择"}</p>
          </div>
        </div>

        {/* 重置按钮 */}
        <Button 
          onClick={() => {
            setWarehouseId("");
            setPositionId("");
          }}
          variant="outline"
        >
          重置选择
        </Button>
      </div>
    </div>
  );
}
