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
  ArrowLeft,
  TrendingUp,
  AlertCircle,
  Plus,
  Settings
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

export default function WarehousePage() {
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
    const totalWarehouses = warehouses.length;
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">仓库管理</h1>
        </div>
        <p className="text-gray-600">管理和监控您的仓库库存</p>
      </div>

      {/* 总体统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">仓库数量</p>
                <p className="text-2xl font-bold text-gray-900">{totalStats.totalWarehouses}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">仓位数量</p>
                <p className="text-2xl font-bold text-gray-900">{totalStats.totalPositions}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <MapPin className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">总容量</p>
                <p className="text-2xl font-bold text-gray-900">{totalStats.totalCapacity}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">使用率</p>
                <p className="text-2xl font-bold text-gray-900">{totalStats.usageRate}%</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3 mb-6">
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          新建仓库
        </Button>
        <Button variant="outline" className="gap-2">
          <Settings className="w-4 h-4" />
          仓库设置
        </Button>
      </div>

      {/* 仓库列表 */}
      <div className="space-y-6">
        {warehouses.length === 0 ? (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无仓库</h3>
                <p className="text-gray-600 mb-4">创建您的第一个仓库来开始管理库存</p>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  创建仓库
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          warehouses.map((warehouse) => {
            const warehouseUsage = warehouse.positions.reduce((sum, pos) => sum + pos.used, 0);
            const warehouseCapacity = warehouse.positions.reduce((sum, pos) => sum + pos.capacity, 0);
            const usage = warehouseCapacity > 0 ? Math.round((warehouseUsage / warehouseCapacity) * 100) : 0;
            const fullPositions = warehouse.positions.filter(pos => pos.used >= pos.capacity).length;

            return (
              <Card key={warehouse.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-blue-600" />
                        {warehouse.name}
                      </CardTitle>
                      {warehouse.description && (
                        <p className="text-sm text-gray-600 mt-1">{warehouse.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getUsageColor(usage)}>
                        {usage}% 使用率
                      </Badge>
                      <Button size="sm" variant="outline">
                        管理
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-gray-900">{warehouse.positions.length}</div>
                      <div className="text-sm text-gray-600">仓位数量</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-gray-900">{warehouseCapacity}</div>
                      <div className="text-sm text-gray-600">总容量</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-gray-900">{warehouseUsage}</div>
                      <div className="text-sm text-gray-600">已使用</div>
                    </div>
                  </div>

                  {/* 仓位列表 */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">仓位详情</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {warehouse.positions.map((position) => {
                        const positionUsage = position.capacity > 0 ? Math.round((position.used / position.capacity) * 100) : 0;
                        const isFull = position.used >= position.capacity;

                        return (
                          <div 
                            key={position.id} 
                            className={`p-3 rounded-lg border ${
                              isFull ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">{position.name}</span>
                              {isFull && (
                                <AlertCircle className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">使用情况</span>
                              <span className="font-medium">{position.used}/{position.capacity}</span>
                            </div>
                            <div className="mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    positionUsage >= 90 ? 'bg-red-500' : 
                                    positionUsage >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(positionUsage, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 警告信息 */}
                  {fullPositions > 0 && (
                    <div className="mt-4 flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm text-yellow-800">
                        {fullPositions} 个仓位已满，请及时处理
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
} 