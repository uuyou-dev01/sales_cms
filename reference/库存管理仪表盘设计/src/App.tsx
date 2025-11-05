import { useState } from "react";
import { SeriesCard } from "./components/SeriesCard";
import { Button } from "./components/ui/button";
import { Plus } from "lucide-react";
import { EditSeriesDialog } from "./components/EditSeriesDialog";

// 采购单状态
export type PurchaseStatus = "国内在途" | "日本在途" | "日本到达";

// 采购单
export interface PurchaseOrder {
  id: string;
  skuId: string;
  skuName: string;
  domesticOrderNumber: string; // 国内单号
  status: PurchaseStatus;
  weight: number; // 重量（kg）
  quantity: number; // 数量
  amount: number; // 金额
  batch: string; // 发货批次
  shippingDate: string; // 发出时间
  arrivalTime?: string; // 到货时间
  shippingCost?: number; // 单个邮费
  totalShippingAmount?: number; // 总邮费
  totalShippingWeight?: number; // 总重量
}

// 库存批次（用于先进先出）
export interface InventoryBatch {
  id: string;
  skuId: string;
  quantity: number;
  inboundDate: string; // 入库时间
  purchaseOrderId?: string; // 关联的采购单ID
  unitCostPrice: number; // 单个成本价（收货价或采购价+邮费）
}

// SKU
export interface SKU {
  id: string;
  name: string;
  stock: number;
  imageUrl: string;
  price: number; // 建议售价
  costPrice: number; // 收货价格
  batches: InventoryBatch[]; // 库存批次
}

// 销售记录
export interface SalesRecord {
  id: string;
  skuId: string;
  skuName: string;
  date: string;
  amount: number; // 销售金额
  quantity: number; // 销售数量
  cost: number; // 成本
  profit: number; // 利润
}

// 系列
export interface Series {
  id: string;
  name: string;
  coverImage: string;
  description?: string;
  skus: SKU[];
  salesRecords: SalesRecord[];
  purchaseOrders: PurchaseOrder[];
}

// 模拟数据
const mockData: Series[] = [
  {
    id: "1",
    name: "泡泡玛特萌在一起",
    coverImage: "https://images.unsplash.com/photo-1725417835584-39518601bf7e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0b3klMjBmaWd1cmluZSUyMGNvbGxlY3Rpb258ZW58MXx8fHwxNzYxMjM2MzQ1fDA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "迪士尼经典角色系列盲盒",
    skus: [
      { 
        id: "1-1", 
        name: "端盒", 
        stock: 10, 
        price: 699,
        costPrice: 600,
        imageUrl: "https://images.unsplash.com/photo-1604257206125-c0d204cb1493?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibGluZCUyMGJveCUyMHRveXxlbnwxfHx8fDE3NjEyMzYzNDh8MA&ixlib=rb-4.1.0&q=80&w=1080",
        batches: [
          { id: "b1-1", skuId: "1-1", quantity: 10, inboundDate: "2025-09-01", unitCostPrice: 600 }
        ]
      },
      { 
        id: "1-2", 
        name: "米奇", 
        stock: 12, 
        price: 59,
        costPrice: 45,
        imageUrl: "https://images.unsplash.com/photo-1760158490392-b97ccf0c9e14?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwYW5pbWUlMjBmaWd1cmV8ZW58MXx8fHwxNzYxMjM2MzQ2fDA&ixlib=rb-4.1.0&q=80&w=1080",
        batches: [
          { id: "b1-2", skuId: "1-2", quantity: 12, inboundDate: "2025-09-01", unitCostPrice: 45 }
        ]
      },
      { 
        id: "1-3", 
        name: "米妮", 
        stock: 13, 
        price: 59,
        costPrice: 45,
        imageUrl: "https://images.unsplash.com/photo-1760007416357-76c955bc713a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2xsZWN0aWJsZSUyMHRveXxlbnwxfHx8fDE3NjEyMzYzNDl8MA&ixlib=rb-4.1.0&q=80&w=1080",
        batches: [
          { id: "b1-3", skuId: "1-3", quantity: 13, inboundDate: "2025-09-01", unitCostPrice: 45 }
        ]
      },
    ],
    salesRecords: [
      { id: "s1-1", skuId: "1-2", skuName: "米奇", date: "2025年10月10日", amount: 59, quantity: 1, cost: 45, profit: 14 },
      { id: "s1-2", skuId: "1-2", skuName: "米奇", date: "2025年10月1日", amount: 59, quantity: 1, cost: 45, profit: 14 },
      { id: "s1-3", skuId: "1-3", skuName: "米妮", date: "2025年9月15日", amount: 118, quantity: 2, cost: 90, profit: 28 },
      { id: "s1-4", skuId: "1-1", skuName: "端盒", date: "2025年9月1日", amount: 2097, quantity: 3, cost: 1800, profit: 297 },
    ],
    purchaseOrders: [
      {
        id: "po1-1",
        skuId: "1-2",
        skuName: "米奇",
        domesticOrderNumber: "DOM2025001",
        status: "国内在途",
        weight: 2.5,
        quantity: 20,
        amount: 1180,
        batch: "2025-10-10-A",
        shippingDate: "2025-10-15",
      },
      {
        id: "po1-2",
        skuId: "1-2",
        skuName: "米奇",
        domesticOrderNumber: "DOM2025002",
        status: "国内在途",
        weight: 1.8,
        quantity: 15,
        amount: 885,
        batch: "2025-10-10-B",
        shippingDate: "2025-10-16",
      },
      {
        id: "po1-3",
        skuId: "1-3",
        skuName: "米妮",
        domesticOrderNumber: "DOM2025003",
        status: "日本在途",
        weight: 3.0,
        quantity: 25,
        amount: 1475,
        batch: "2025-10-12-A",
        shippingDate: "2025-10-10",
      },
    ],
  },
  {
    id: "2",
    name: "toptoy蜡笔小新换装系列",
    coverImage: "https://images.unsplash.com/photo-1760007418582-331b744dc60f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZXNpZ25lciUyMHRveXxlbnwxfHx8fDE3NjExMzA0MzJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "蜡笔小新换装主题盲盒",
    skus: [
      { 
        id: "2-1", 
        name: "端盒", 
        stock: 10, 
        price: 699,
        costPrice: 600,
        imageUrl: "https://images.unsplash.com/photo-1604257206125-c0d204cb1493?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibGluZCUyMGJveCUyMHRveXxlbnwxfHx8fDE3NjEyMzYzNDh8MA&ixlib=rb-4.1.0&q=80&w=1080",
        batches: [
          { id: "b2-1", skuId: "2-1", quantity: 10, inboundDate: "2025-09-05", unitCostPrice: 600 }
        ]
      },
      { 
        id: "2-2", 
        name: "小白", 
        stock: 10, 
        price: 59,
        costPrice: 45,
        imageUrl: "https://images.unsplash.com/photo-1713950945892-50d86256d428?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW55bCUyMHRveXxlbnwxfHx8fDE3NjEyMzYzNDl8MA&ixlib=rb-4.1.0&q=80&w=1080",
        batches: [
          { id: "b2-2", skuId: "2-2", quantity: 10, inboundDate: "2025-09-05", unitCostPrice: 45 }
        ]
      },
      { 
        id: "2-3", 
        name: "左卫门", 
        stock: 10, 
        price: 59,
        costPrice: 45,
        imageUrl: "https://images.unsplash.com/photo-1760007416357-76c955bc713a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2xsZWN0aWJsZSUyMHRveXxlbnwxfHx8fDE3NjEyMzYzNDl8MA&ixlib=rb-4.1.0&q=80&w=1080",
        batches: [
          { id: "b2-3", skuId: "2-3", quantity: 10, inboundDate: "2025-09-05", unitCostPrice: 45 }
        ]
      },
    ],
    salesRecords: [
      { id: "s2-1", skuId: "2-2", skuName: "小白", date: "2025年10月3日", amount: 118, quantity: 2, cost: 90, profit: 28 },
      { id: "s2-2", skuId: "2-3", skuName: "左卫门", date: "2025年9月20日", amount: 59, quantity: 1, cost: 45, profit: 14 },
      { id: "s2-3", skuId: "2-1", skuName: "端盒", date: "2025年9月5日", amount: 699, quantity: 1, cost: 600, profit: 99 },
    ],
    purchaseOrders: [],
  },
  {
    id: "3",
    name: "泡泡玛特SKULLPANDA城市系列",
    coverImage: "https://images.unsplash.com/photo-1760007416357-76c955bc713a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2xsZWN0aWJsZSUyMHRveXxlbnwxfHx8fDE3NjEyMzYzNDl8MA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "世界城市主题系列",
    skus: [
      { 
        id: "3-1", 
        name: "端盒", 
        stock: 15, 
        price: 699,
        costPrice: 600,
        imageUrl: "https://images.unsplash.com/photo-1604257206125-c0d204cb1493?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibGluZCUyMGJveCUyMHRveXxlbnwxfHx8fDE3NjEyMzYzNDh8MA&ixlib=rb-4.1.0&q=80&w=1080",
        batches: [
          { id: "b3-1", skuId: "3-1", quantity: 15, inboundDate: "2025-09-10", unitCostPrice: 600 }
        ]
      },
      { 
        id: "3-2", 
        name: "纽约", 
        stock: 8, 
        price: 59,
        costPrice: 45,
        imageUrl: "https://images.unsplash.com/photo-1713950945892-50d86256d428?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW55bCUyMHRveXxlbnwxfHx8fDE3NjEyMzYzNDl8MA&ixlib=rb-4.1.0&q=80&w=1080",
        batches: [
          { id: "b3-2", skuId: "3-2", quantity: 8, inboundDate: "2025-09-10", unitCostPrice: 45 }
        ]
      },
      { 
        id: "3-3", 
        name: "巴黎", 
        stock: 6, 
        price: 59,
        costPrice: 45,
        imageUrl: "https://images.unsplash.com/photo-1760158490392-b97ccf0c9e14?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwYW5pbWUlMjBmaWd1cmV8ZW58MXx8fHwxNzYxMjM2MzQ2fDA&ixlib=rb-4.1.0&q=80&w=1080",
        batches: [
          { id: "b3-3", skuId: "3-3", quantity: 6, inboundDate: "2025-09-10", unitCostPrice: 45 }
        ]
      },
      { 
        id: "3-4", 
        name: "东京", 
        stock: 11, 
        price: 59,
        costPrice: 45,
        imageUrl: "https://images.unsplash.com/photo-1760007418582-331b744dc60f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZXNpZ25lciUyMHRveXxlbnwxfHx8fDE3NjExMzA0MzJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
        batches: [
          { id: "b3-4", skuId: "3-4", quantity: 11, inboundDate: "2025-09-10", unitCostPrice: 45 }
        ]
      },
    ],
    salesRecords: [
      { id: "s3-1", skuId: "3-2", skuName: "纽约", date: "2025年10月5日", amount: 177, quantity: 3, cost: 135, profit: 42 },
      { id: "s3-2", skuId: "3-3", skuName: "巴黎", date: "2025年9月18日", amount: 118, quantity: 2, cost: 90, profit: 28 },
      { id: "s3-3", skuId: "3-4", skuName: "东京", date: "2025年9月8日", amount: 59, quantity: 1, cost: 45, profit: 14 },
    ],
    purchaseOrders: [],
  },
];

export default function App() {
  const [seriesList, setSeriesList] = useState<Series[]>(mockData);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleStockUpdate = (seriesId: string, skuId: string, newStock: number) => {
    setSeriesList((prev) =>
      prev.map((series) =>
        series.id === seriesId
          ? {
              ...series,
              skus: series.skus.map((sku) =>
                sku.id === skuId ? { ...sku, stock: newStock } : sku
              ),
            }
          : series
      )
    );
  };

  const handleSeriesUpdate = (updatedSeries: Series) => {
    setSeriesList((prev) =>
      prev.map((series) =>
        series.id === updatedSeries.id ? updatedSeries : series
      )
    );
  };

  const handleSeriesCreate = (newSeries: Series) => {
    setSeriesList((prev) => [...prev, newSeries]);
  };

  const handleEditClick = (series: Series) => {
    setEditingSeries(series);
    setIsCreating(false);
  };

  const handleCreateClick = () => {
    setEditingSeries({
      id: Date.now().toString(),
      name: "",
      coverImage: "https://images.unsplash.com/photo-1604257206125-c0d204cb1493?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibGluZCUyMGJveCUyMHRveXxlbnwxfHx8fDE3NjEyMzYzNDh8MA&ixlib=rb-4.1.0&q=80&w=1080",
      description: "",
      skus: [],
      salesRecords: [],
      purchaseOrders: [],
    });
    setIsCreating(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1>库存管理界面</h1>
          <Button onClick={handleCreateClick}>
            <Plus className="w-4 h-4 mr-2" />
            新增系列
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {seriesList.map((series) => (
            <SeriesCard
              key={series.id}
              series={series}
              onSeriesUpdate={handleSeriesUpdate}
              onEditClick={handleEditClick}
            />
          ))}
        </div>
      </div>

      <EditSeriesDialog
        isOpen={editingSeries !== null}
        onClose={() => setEditingSeries(null)}
        series={editingSeries}
        onSave={isCreating ? handleSeriesCreate : handleSeriesUpdate}
        isCreating={isCreating}
      />
    </div>
  );
}
