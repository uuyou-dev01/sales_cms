"use client";
import * as React from "react";
import { EmojiIcons } from "@/components/emoji-icons";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building2, Package } from "lucide-react";
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

interface WarehouseSelectorProps {
  selectedWarehouseId: string;
  selectedPositionId: string;
  onWarehouseChange: (warehouseId: string) => void;
  onPositionChange: (positionId: string) => void;
  className?: string;
}

export function WarehouseSelector({
  selectedWarehouseId,
  selectedPositionId,
  onWarehouseChange,
  onPositionChange,
  className = "",
}: WarehouseSelectorProps) {
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [loading, setLoading] = React.useState(false);

  // 获取仓库数据
  React.useEffect(() => {
    setLoading(true);
    fetch("/api/warehouses")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setWarehouses(data);
        }
      })
      .catch(() => {
        console.error("获取仓库数据失败");
      })
      .finally(() => setLoading(false));
  }, []);

  // 获取当前选中的仓库
  const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId);
  
  // 获取当前选中的仓位
  const selectedPosition = selectedWarehouse?.positions.find(p => p.id === selectedPositionId);

  // 获取使用率颜色
  const getUsageColor = (used: number, capacity: number) => {
    const usage = capacity > 0 ? (used / capacity) * 100 : 0;
    if (usage >= 90) return "text-red-600 bg-red-100";
    if (usage >= 70) return "text-yellow-600 bg-yellow-100";
    return "text-green-600 bg-green-100";
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <Label htmlFor="warehouse-select">选择仓库</Label>
        <Select
          value={selectedWarehouseId}
          onValueChange={(value) => {
            onWarehouseChange(value);
            onPositionChange(""); // 清空仓位选择
          }}
        >
          <SelectTrigger id="warehouse-select">
            <SelectValue placeholder="请选择仓库" />
          </SelectTrigger>
          <SelectContent>
            {loading ? (
              <SelectItem value="loading" disabled>
                加载中...
              </SelectItem>
            ) : warehouses.length === 0 ? (
              <SelectItem value="no-warehouses" disabled>
                暂无仓库
              </SelectItem>
            ) : (
              warehouses.map((warehouse) => (
                <SelectItem key={warehouse.id} value={warehouse.id}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{EmojiIcons.Building2}</span>
                    {warehouse.name}
                    {warehouse.description && (
                      <span className="text-xs text-gray-500">
                        ({warehouse.description})
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {selectedWarehouse && (
        <div>
          <Label htmlFor="position-select">选择仓位</Label>
          <Select
            value={selectedPositionId}
            onValueChange={onPositionChange}
          >
            <SelectTrigger id="position-select">
              <SelectValue placeholder="请选择仓位" />
            </SelectTrigger>
            <SelectContent>
              {selectedWarehouse.positions.length === 0 ? (
                <SelectItem value="no-positions" disabled>
                  该仓库暂无仓位
                </SelectItem>
              ) : (
                selectedWarehouse.positions.map((position) => {
                  const usage = position.capacity > 0 ? (position.used / position.capacity) * 100 : 0;
                  const isFull = position.used >= position.capacity;
                  
                  return (
                    <SelectItem 
                      key={position.id} 
                      value={position.id}
                      disabled={isFull}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{EmojiIcons.MapPin}</span>
                          {position.name}
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getUsageColor(position.used, position.capacity)}`}
                        >
                          {position.used}/{position.capacity}
                        </Badge>
                      </div>
                    </SelectItem>
                  );
                })
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedPosition && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{EmojiIcons.Package}</span>
              <span className="text-sm font-medium">
                {selectedWarehouse?.name} - {selectedPosition.name}
              </span>
            </div>
            <Badge 
              variant="outline" 
              className={getUsageColor(selectedPosition.used, selectedPosition.capacity)}
            >
              {selectedPosition.used}/{selectedPosition.capacity}
            </Badge>
          </div>
          {selectedPosition.used >= selectedPosition.capacity && (
            <p className="text-xs text-red-600 mt-1">
              该仓位已满，无法添加更多商品
            </p>
          )}
        </div>
      )}
    </div>
  );
} 