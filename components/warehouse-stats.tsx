"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Warehouse, 
  MapPin, 
  Package, 
  Building2, 
  ArrowRight,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { useRouter } from "next/navigation";

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

export function WarehouseStats() {
  const { toast } = useToast();
  const router = useRouter();
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
        } else {
          toast({ title: "获取仓库数据失败", variant: "destructive" });
        }
      })
      .catch(() => {
        toast({ title: "获取仓库数据失败", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [toast]);

  // 计算总体统计
  const totalStats = React.useMemo(() => {
    let totalWarehouses = warehouses.length;
    let totalPositions = 0;
    let totalCapacity = 0;
    let totalUsed = 0;
    let fullPositions = 0;

    warehouses.forEach(warehouse => {
      warehouse.positions.forEach(position => {
        totalPositions++;
        totalCapacity += position.capacity;
        totalUsed += position.used;
        if (position.used >= position.capacity) {
          fullPositions++;
        }
      });
    });

    const usageRate = totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0;

    return {
      totalWarehouses,
      totalPositions,
      totalCapacity,
      totalUsed,
      fullPositions,
      usageRate
    };
  }, [warehouses]);

  // 获取使用率颜色
  const getUsageColor = (usage: number) => {
    if (usage >= 90) return "text-red-600 bg-red-100";
    if (usage >= 70) return "text-yellow-600 bg-yellow-100";
    return "text-green-600 bg-green-100";
  };

  // 跳转到仓库管理
  const handleGoToWarehouse = () => {
    router.push("/warehouse");
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="w-5 h-5" />
            仓库统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">加载中...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-blue-600" />
            仓库统计
          </CardTitle>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleGoToWarehouse}
            className="gap-2"
          >
            管理仓库
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {warehouses.length === 0 ? (
          <div className="text-center py-6">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-3">暂无仓库数据</p>
            <Button size="sm" onClick={handleGoToWarehouse}>
              创建第一个仓库
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 总体统计 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{totalStats.totalWarehouses}</div>
                <div className="text-xs text-blue-600">仓库数量</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{totalStats.totalPositions}</div>
                <div className="text-xs text-green-600">仓位数量</div>
              </div>
            </div>

            {/* 使用率 */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">总体使用率</span>
              </div>
              <Badge className={getUsageColor(totalStats.usageRate)}>
                {totalStats.usageRate}%
              </Badge>
            </div>

            {/* 容量信息 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">总容量</span>
                <span className="font-medium">{totalStats.totalCapacity} 件</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">已使用</span>
                <span className="font-medium">{totalStats.totalUsed} 件</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">剩余空间</span>
                <span className="font-medium">{totalStats.totalCapacity - totalStats.totalUsed} 件</span>
              </div>
            </div>

            {/* 警告信息 */}
            {totalStats.fullPositions > 0 && (
              <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  {totalStats.fullPositions} 个仓位已满
                </span>
              </div>
            )}

            {/* 仓库列表预览 */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">仓库概览</h4>
              {warehouses.slice(0, 3).map((warehouse) => {
                const warehouseUsage = warehouse.positions.reduce((sum, pos) => sum + pos.used, 0);
                const warehouseCapacity = warehouse.positions.reduce((sum, pos) => sum + pos.capacity, 0);
                const usage = warehouseCapacity > 0 ? Math.round((warehouseUsage / warehouseCapacity) * 100) : 0;

                return (
                  <div key={warehouse.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">{warehouse.name}</span>
                    </div>
                    <Badge variant="outline" className={`text-xs ${getUsageColor(usage)}`}>
                      {warehouseUsage}/{warehouseCapacity}
                    </Badge>
                  </div>
                );
              })}
              {warehouses.length > 3 && (
                <div className="text-center">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={handleGoToWarehouse}
                    className="text-xs"
                  >
                    查看全部 {warehouses.length} 个仓库
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 