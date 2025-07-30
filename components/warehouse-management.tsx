"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Warehouse, 
  Plus, 
  Edit, 
  Trash2, 
  MapPin, 
  Building2, 
} from "lucide-react";

interface WarehousePosition {
  id: string;
  name: string;
  capacity: number;
  used: number;
  warehouseId: string;
  items: any[];
}

interface Warehouse {
  id: string;
  name: string;
  description?: string;
  positions: WarehousePosition[];
}

export function WarehouseManagement() {
  const { toast } = useToast();
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [refreshFlag, setRefreshFlag] = React.useState(0);

  // 仓库表单状态
  const [warehouseDialogOpen, setWarehouseDialogOpen] = React.useState(false);
  const [editingWarehouse, setEditingWarehouse] = React.useState<Warehouse | null>(null);
  const [warehouseForm, setWarehouseForm] = React.useState({
    name: "",
    description: "",
  });

  // 仓位表单状态
  const [positionDialogOpen, setPositionDialogOpen] = React.useState(false);
  const [editingPosition, setEditingPosition] = React.useState<WarehousePosition | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = React.useState("");
  const [positionForm, setPositionForm] = React.useState({
    name: "",
    capacity: "",
  });

  // 获取仓库数据
  React.useEffect(() => {
    setLoading(true);
    fetch("/api/warehouses")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          toast({ title: "获取仓库数据失败", variant: "destructive" });
        } else {
          setWarehouses(data);
        }
      })
      .catch(() => {
        toast({ title: "获取仓库数据失败", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [refreshFlag, toast]);

  // 重置仓库表单
  const resetWarehouseForm = () => {
    setWarehouseForm({ name: "", description: "" });
    setEditingWarehouse(null);
  };

  // 重置仓位表单
  const resetPositionForm = () => {
    setPositionForm({ name: "", capacity: "" });
    setEditingPosition(null);
    setSelectedWarehouseId("");
  };

  // 创建/更新仓库
  const handleWarehouseSubmit = async () => {
    if (!warehouseForm.name.trim()) {
      toast({ title: "仓库名称不能为空", variant: "destructive" });
      return;
    }

    try {
      const url = editingWarehouse 
        ? `/api/warehouses/${editingWarehouse.id}`
        : "/api/warehouses";
      
      const method = editingWarehouse ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(warehouseForm),
      });

      if (response.ok) {
        toast({ 
          title: editingWarehouse ? "仓库更新成功" : "仓库创建成功" 
        });
        setWarehouseDialogOpen(false);
        resetWarehouseForm();
        setRefreshFlag((f) => f + 1);
      } else {
        const error = await response.json();
        toast({ title: error.error || "操作失败", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "操作失败", variant: "destructive" });
    }
  };

  // 创建/更新仓位
  const handlePositionSubmit = async () => {
    if (!positionForm.name.trim() || !positionForm.capacity) {
      toast({ title: "仓位名称和容量不能为空", variant: "destructive" });
      return;
    }

    if (!selectedWarehouseId && !editingPosition) {
      toast({ title: "请选择仓库", variant: "destructive" });
      return;
    }

    try {
      const warehouseId = editingPosition?.warehouseId || selectedWarehouseId;
      const url = editingPosition 
        ? `/api/warehouses/positions/${editingPosition.id}`
        : "/api/warehouses/positions";
      
      const method = editingPosition ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...positionForm,
          capacity: parseInt(positionForm.capacity),
          warehouseId,
        }),
      });

      if (response.ok) {
        toast({ 
          title: editingPosition ? "仓位更新成功" : "仓位创建成功" 
        });
        setPositionDialogOpen(false);
        resetPositionForm();
        setRefreshFlag((f) => f + 1);
      } else {
        const error = await response.json();
        toast({ title: error.error || "操作失败", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "操作失败", variant: "destructive" });
    }
  };

  // 删除仓库
  const handleDeleteWarehouse = async (warehouseId: string) => {
    try {
      const response = await fetch(`/api/warehouses/${warehouseId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({ title: "仓库删除成功" });
        setRefreshFlag((f) => f + 1);
      } else {
        const error = await response.json();
        toast({ title: error.error || "删除失败", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "删除失败", variant: "destructive" });
    }
  };

  // 删除仓位
  const handleDeletePosition = async (positionId: string) => {
    try {
      const response = await fetch(`/api/warehouses/positions/${positionId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({ title: "仓位删除成功" });
        setRefreshFlag((f) => f + 1);
      } else {
        const error = await response.json();
        toast({ title: error.error || "删除失败", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "删除失败", variant: "destructive" });
    }
  };

  // 计算仓库使用率
  const getWarehouseUsage = (warehouse: Warehouse) => {
    const totalCapacity = warehouse.positions.reduce((sum, pos) => sum + pos.capacity, 0);
    const totalUsed = warehouse.positions.reduce((sum, pos) => sum + pos.used, 0);
    return totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0;
  };

  // 获取使用率颜色
  const getUsageColor = (usage: number) => {
    if (usage >= 90) return "text-red-600 bg-red-100";
    if (usage >= 70) return "text-yellow-600 bg-yellow-100";
    return "text-green-600 bg-green-100";
  };

  return (
    <div className="space-y-6">
      {/* 标题和操作按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">仓库管理</h2>
          <p className="text-gray-600">管理您的仓库和仓位信息</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={warehouseDialogOpen} onOpenChange={setWarehouseDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetWarehouseForm()}>
                <Plus className="w-4 h-4 mr-2" />
                添加仓库
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingWarehouse ? "编辑仓库" : "添加仓库"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="warehouse-name">仓库名称</Label>
                  <Input
                    id="warehouse-name"
                    value={warehouseForm.name}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                    placeholder="如：家庭仓、办公间"
                  />
                </div>
                <div>
                  <Label htmlFor="warehouse-description">描述（可选）</Label>
                  <Input
                    id="warehouse-description"
                    value={warehouseForm.description}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, description: e.target.value })}
                    placeholder="仓库描述"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleWarehouseSubmit} className="flex-1">
                    {editingWarehouse ? "更新" : "创建"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setWarehouseDialogOpen(false)}
                    className="flex-1"
                  >
                    取消
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={positionDialogOpen} onOpenChange={setPositionDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => resetPositionForm()}>
                <Plus className="w-4 h-4 mr-2" />
                添加仓位
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingPosition ? "编辑仓位" : "添加仓位"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {!editingPosition && (
                  <div>
                    <Label htmlFor="warehouse-select">选择仓库</Label>
                    <select
                      id="warehouse-select"
                      value={selectedWarehouseId}
                      onChange={(e) => setSelectedWarehouseId(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="">请选择仓库</option>
                      {warehouses.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <Label htmlFor="position-name">仓位名称</Label>
                  <Input
                    id="position-name"
                    value={positionForm.name}
                    onChange={(e) => setPositionForm({ ...positionForm, name: e.target.value })}
                    placeholder="如：A区、B区"
                  />
                </div>
                <div>
                  <Label htmlFor="position-capacity">最大容量</Label>
                  <Input
                    id="position-capacity"
                    type="number"
                    value={positionForm.capacity}
                    onChange={(e) => setPositionForm({ ...positionForm, capacity: e.target.value })}
                    placeholder="如：30"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handlePositionSubmit} className="flex-1">
                    {editingPosition ? "更新" : "创建"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setPositionDialogOpen(false)}
                    className="flex-1"
                  >
                    取消
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 仓库列表 */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      ) : warehouses.length === 0 ? (
        <div className="text-center py-8">
          <Warehouse className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900">暂无仓库</p>
          <p className="text-gray-600">开始创建您的第一个仓库吧</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {warehouses.map((warehouse) => {
            const usage = getWarehouseUsage(warehouse);
            return (
              <div key={warehouse.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">{warehouse.name}</h3>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingWarehouse(warehouse);
                        setWarehouseForm({
                          name: warehouse.name,
                          description: warehouse.description || "",
                        });
                        setWarehouseDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>删除仓库</AlertDialogTitle>
                          <AlertDialogDescription>
                            确定要删除仓库 "{warehouse.name}" 吗？此操作不可撤销。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteWarehouse(warehouse.id)}>
                            删除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {warehouse.description && (
                  <p className="text-sm text-gray-600 mb-4">{warehouse.description}</p>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">使用率</span>
                    <Badge className={getUsageColor(usage)}>
                      {usage}%
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">仓位数量</span>
                      <span className="font-medium">{warehouse.positions.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">商品数量</span>
                      <span className="font-medium">
                        {warehouse.positions.reduce((sum, pos) => sum + pos.items.length, 0)}
                      </span>
                    </div>
                  </div>

                  {/* 仓位列表 */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">仓位</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedWarehouseId(warehouse.id);
                          setPositionDialogOpen(true);
                        }}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {warehouse.positions.map((position) => (
                        <div key={position.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium">{position.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {position.used}/{position.capacity}
                            </Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingPosition(position);
                                setPositionForm({
                                  name: position.name,
                                  capacity: position.capacity.toString(),
                                });
                                setPositionDialogOpen(true);
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>删除仓位</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    确定要删除仓位 "{position.name}" 吗？此操作不可撤销。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>取消</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeletePosition(position.id)}>
                                    删除
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                      {warehouse.positions.length === 0 && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          暂无仓位
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 