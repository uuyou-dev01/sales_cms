"use client";
import * as React from "react";
import { EmojiIcons } from "@/components/emoji-icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

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
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = React.useState<Warehouse | null>(null);
  const [formData, setFormData] = React.useState({
    name: "",
    description: ""
  });
  
  // 仓位管理状态
  const [positionCreateDialogOpen, setPositionCreateDialogOpen] = React.useState(false);
  const [positionEditDialogOpen, setPositionEditDialogOpen] = React.useState(false);
  const [positionDeleteDialogOpen, setPositionDeleteDialogOpen] = React.useState(false);
  const [selectedPosition, setSelectedPosition] = React.useState<WarehousePosition | null>(null);
  const [positionFormData, setPositionFormData] = React.useState({
    name: "",
    capacity: ""
  });
  const [selectedWarehouseForPosition, setSelectedWarehouseForPosition] = React.useState<Warehouse | null>(null);

  // 获取仓库数据
  const fetchWarehouses = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/warehouses");
      const data = await response.json();
      if (!data.error) {
        setWarehouses(data);
      } else {
        toast({ title: "获取仓库数据失败", variant: "destructive" });
      }
    } catch {
      toast({ title: "获取仓库数据失败", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  // 创建仓库
  const handleCreateWarehouse = async () => {
    if (!formData.name.trim()) {
      toast({ title: "仓库名称不能为空", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch("/api/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (!result.error) {
        toast({ title: "仓库创建成功" });
        setCreateDialogOpen(false);
        setFormData({ name: "", description: "" });
        fetchWarehouses();
      } else {
        toast({ title: result.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "创建仓库失败", variant: "destructive" });
    }
  };

  // 编辑仓库
  const handleEditWarehouse = async () => {
    if (!selectedWarehouse || !formData.name.trim()) {
      toast({ title: "仓库名称不能为空", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch(`/api/warehouses/${selectedWarehouse.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (!result.error) {
        toast({ title: "仓库更新成功" });
        setEditDialogOpen(false);
        setSelectedWarehouse(null);
        setFormData({ name: "", description: "" });
        fetchWarehouses();
      } else {
        toast({ title: result.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "更新仓库失败", variant: "destructive" });
    }
  };

  // 删除仓库
  const handleDeleteWarehouse = async () => {
    if (!selectedWarehouse) return;

    try {
      const response = await fetch(`/api/warehouses/${selectedWarehouse.id}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (!result.error) {
        toast({ title: "仓库删除成功" });
        setDeleteDialogOpen(false);
        setSelectedWarehouse(null);
        fetchWarehouses();
      } else {
        toast({ title: result.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "删除仓库失败", variant: "destructive" });
    }
  };

  // 打开编辑对话框
  const openEditDialog = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      description: warehouse.description || ""
    });
    setEditDialogOpen(true);
  };

  // 打开删除对话框
  const openDeleteDialog = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setDeleteDialogOpen(true);
  };

  // 仓位管理函数
  const handleCreatePosition = async () => {
    if (!selectedWarehouseForPosition || !positionFormData.name.trim() || !positionFormData.capacity.trim()) {
      toast({ title: "仓位名称和容量不能为空", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch("/api/warehouses/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: positionFormData.name,
          capacity: parseInt(positionFormData.capacity),
          warehouseId: selectedWarehouseForPosition.id,
        }),
      });

      const result = await response.json();
      if (!result.error) {
        toast({ title: "仓位创建成功" });
        setPositionCreateDialogOpen(false);
        setPositionFormData({ name: "", capacity: "" });
        setSelectedWarehouseForPosition(null);
        fetchWarehouses();
      } else {
        toast({ title: result.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "创建仓位失败", variant: "destructive" });
    }
  };

  const handleEditPosition = async () => {
    if (!selectedPosition || !positionFormData.name.trim() || !positionFormData.capacity.trim()) {
      toast({ title: "仓位名称和容量不能为空", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch(`/api/warehouses/positions/${selectedPosition.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: positionFormData.name,
          capacity: parseInt(positionFormData.capacity),
        }),
      });

      const result = await response.json();
      if (!result.error) {
        toast({ title: "仓位更新成功" });
        setPositionEditDialogOpen(false);
        setSelectedPosition(null);
        setPositionFormData({ name: "", capacity: "" });
        fetchWarehouses();
      } else {
        toast({ title: result.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "更新仓位失败", variant: "destructive" });
    }
  };

  const handleDeletePosition = async () => {
    if (!selectedPosition) return;

    try {
      const response = await fetch(`/api/warehouses/positions/${selectedPosition.id}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (!result.error) {
        toast({ title: "仓位删除成功" });
        setPositionDeleteDialogOpen(false);
        setSelectedPosition(null);
        fetchWarehouses();
      } else {
        toast({ title: result.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "删除仓位失败", variant: "destructive" });
    }
  };

  // 打开仓位编辑对话框
  const openPositionEditDialog = (position: WarehousePosition, warehouse: Warehouse) => {
    setSelectedPosition(position);
    setSelectedWarehouseForPosition(warehouse);
    setPositionFormData({
      name: position.name,
      capacity: position.capacity.toString()
    });
    setPositionEditDialogOpen(true);
  };

  // 打开仓位删除对话框
  const openPositionDeleteDialog = (position: WarehousePosition) => {
    setSelectedPosition(position);
    setPositionDeleteDialogOpen(true);
  };

  // 打开创建仓位对话框
  const openPositionCreateDialog = (warehouse: Warehouse) => {
    setSelectedWarehouseForPosition(warehouse);
    setPositionFormData({ name: "", capacity: "" });
    setPositionCreateDialogOpen(true);
  };

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
        <div className="flex items-center justify-center h-64">
          <span className="text-lg">{EmojiIcons.Loader2}</span>
          <span className="ml-2">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 页面标题和操作按钮 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <span className="text-lg">{EmojiIcons.Warehouse}</span>
            仓库管理
          </h1>
          <p className="text-gray-600 mt-2">管理您的仓库和仓位信息</p>
        </div>
        <Button 
          onClick={() => setCreateDialogOpen(true)}
          className="gap-2"
        >
          <span className="text-lg">{EmojiIcons.Plus}</span>
          创建仓库
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">{EmojiIcons.Building2}</span>
              <div>
                <div className="text-2xl font-bold">{totalStats.totalWarehouses}</div>
                <div className="text-sm text-gray-600">仓库总数</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">{EmojiIcons.MapPin}</span>
              <div>
                <div className="text-2xl font-bold">{totalStats.totalPositions}</div>
                <div className="text-sm text-gray-600">仓位总数</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">{EmojiIcons.Package}</span>
              <div>
                <div className="text-2xl font-bold">{totalStats.totalUsed}</div>
                <div className="text-sm text-gray-600">已使用</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">{EmojiIcons.TrendingUp}</span>
              <div>
                <div className="text-2xl font-bold">{totalStats.usageRate}%</div>
                <div className="text-sm text-gray-600">使用率</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 仓库列表 */}
      <div className="space-y-6">
        {warehouses.length === 0 ? (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <span className="text-lg">{EmojiIcons.Building2}</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无仓库</h3>
                <p className="text-gray-600 mb-4">创建您的第一个仓库来开始管理库存</p>
                <Button 
                  onClick={() => setCreateDialogOpen(true)}
                  className="gap-2"
                >
                  <span className="text-lg">{EmojiIcons.Plus}</span>
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
                        <span className="text-lg">{EmojiIcons.Building2}</span>
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
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => openEditDialog(warehouse)}
                      >
                        <span className="text-lg">{EmojiIcons.Edit}</span>
                        编辑
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => openDeleteDialog(warehouse)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <span className="text-lg">{EmojiIcons.Delete}</span>
                        删除
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
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-700">仓位详情</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openPositionCreateDialog(warehouse)}
                        className="gap-1 text-xs"
                      >
                        <span className="text-lg">{EmojiIcons.Plus}</span>
                        添加仓位
                      </Button>
                    </div>
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
                              <div className="flex items-center gap-1">
                                {isFull && (
                                  <span className="text-lg">{EmojiIcons.AlertCircle}</span>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openPositionEditDialog(position, warehouse)}
                                  className="h-6 w-6 p-0 hover:bg-gray-200"
                                >
                                  <span className="text-sm">{EmojiIcons.Edit}</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openPositionDeleteDialog(position)}
                                  className="h-6 w-6 p-0 hover:bg-gray-200 text-red-600"
                                >
                                  <span className="text-sm">{EmojiIcons.Delete}</span>
                                </Button>
                              </div>
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
                      <span className="text-lg">{EmojiIcons.AlertCircle}</span>
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

      {/* 创建仓库对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">{EmojiIcons.Plus}</span>
              创建新仓库
            </DialogTitle>
            <DialogDescription>
              填写仓库信息来创建新的仓库
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">仓库名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入仓库名称"
              />
            </div>
            <div>
              <Label htmlFor="description">仓库描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="输入仓库描述（可选）"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateWarehouse}>
              <span className="text-lg">{EmojiIcons.Save}</span>
              创建仓库
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑仓库对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">{EmojiIcons.Edit}</span>
              编辑仓库
            </DialogTitle>
            <DialogDescription>
              修改仓库信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">仓库名称 *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入仓库名称"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">仓库描述</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="输入仓库描述（可选）"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEditWarehouse}>
              <span className="text-lg">{EmojiIcons.Save}</span>
              保存修改
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除仓库确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">{EmojiIcons.AlertTriangle}</span>
              确认删除仓库
            </DialogTitle>
            <DialogDescription>
              您确定要删除仓库 &quot;{selectedWarehouse?.name}&quot; 吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteWarehouse}
            >
              <span className="text-lg">{EmojiIcons.Delete}</span>
              确认删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 创建仓位对话框 */}
      <Dialog open={positionCreateDialogOpen} onOpenChange={setPositionCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">{EmojiIcons.Plus}</span>
              创建新仓位
            </DialogTitle>
            <DialogDescription>
              为仓库 &quot;{selectedWarehouseForPosition?.name}&quot; 添加新的仓位
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="position-name">仓位名称 *</Label>
              <Input
                id="position-name"
                value={positionFormData.name}
                onChange={(e) => setPositionFormData({ ...positionFormData, name: e.target.value })}
                placeholder="输入仓位名称"
              />
            </div>
            <div>
              <Label htmlFor="position-capacity">容量 *</Label>
              <Input
                id="position-capacity"
                type="number"
                min="1"
                value={positionFormData.capacity}
                onChange={(e) => setPositionFormData({ ...positionFormData, capacity: e.target.value })}
                placeholder="输入容量数量"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPositionCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreatePosition}>
              <span className="text-lg">{EmojiIcons.Save}</span>
              创建仓位
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑仓位对话框 */}
      <Dialog open={positionEditDialogOpen} onOpenChange={setPositionEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">{EmojiIcons.Edit}</span>
              编辑仓位
            </DialogTitle>
            <DialogDescription>
              修改仓位信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-position-name">仓位名称 *</Label>
              <Input
                id="edit-position-name"
                value={positionFormData.name}
                onChange={(e) => setPositionFormData({ ...positionFormData, name: e.target.value })}
                placeholder="输入仓位名称"
              />
            </div>
            <div>
              <Label htmlFor="edit-position-capacity">容量 *</Label>
              <Input
                id="edit-position-capacity"
                type="number"
                min="1"
                value={positionFormData.capacity}
                onChange={(e) => setPositionFormData({ ...positionFormData, capacity: e.target.value })}
                placeholder="输入容量数量"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPositionEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEditPosition}>
              <span className="text-lg">{EmojiIcons.Save}</span>
              保存修改
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除仓位确认对话框 */}
      <Dialog open={positionDeleteDialogOpen} onOpenChange={setPositionDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">{EmojiIcons.AlertTriangle}</span>
              确认删除仓位
            </DialogTitle>
            <DialogDescription>
              您确定要删除仓位 &quot;{selectedPosition?.name}&quot; 吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPositionDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeletePosition}
            >
              <span className="text-lg">{EmojiIcons.Delete}</span>
              确认删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 