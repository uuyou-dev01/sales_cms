"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function TestApiPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testCreate = async () => {
    setLoading(true);
    try {
      const testData = {
        itemId: "TEST_ITEM_001",
        itemName: "测试商品",
        itemNumber: "TEST123",
        domesticShipping: "10",
        internationalShipping: "100",
        domesticTrackingNumber: "SF123456",
        internationalTrackingNumber: "DHL789012",
        itemType: "鞋子",
        itemBrand: "Nike",
        itemCondition: "全新",
        purchasePrice: "500",
        purchaseDate: "2024-01-01",
        orderStatus: "在途（国内）",
        purchasePlatform: "95分",
        itemMfgDate: "2023年春季",
        itemColor: "黑色",
        itemSize: "42",
        itemRemarks: "测试备注",
        shipping: "",
        purchasePriceCurrency: "CNY",
        purchasePriceExchangeRate: "1",
        itemGrossProfit: "0",
        itemNetProfit: "0",
        position: "",
        warehousePositionId: "",
        launchDate: null,
        storageDuration: "0",
        listingPlatforms: [],
        isReturn: false,
        soldDate: null,
        soldPrice: "0",
        soldPlatform: "",
        soldPriceCurrency: "JPY",
        soldPriceExchangeRate: "0.05",
        photos: [],
        otherFees: [
          {
            id: "1",
            type: "包装费",
            amount: "5",
            currency: "CNY",
            description: "包装材料费用"
          }
        ]
      };

      const response = await fetch("/api/items/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testData),
      });

      const data = await response.json();
      setResult(data);
      
      if (response.ok) {
        alert("创建成功！");
      } else {
        alert("创建失败：" + data.error);
      }
    } catch (error) {
      console.error("测试失败:", error);
      alert("测试失败：" + error);
    } finally {
      setLoading(false);
    }
  };

  const testUpdate = async () => {
    setLoading(true);
    try {
      const testData = {
        itemId: "TEST_ITEM_001",
        itemName: "更新后的测试商品",
        itemNumber: "TEST123_UPDATED",
        domesticShipping: "15",
        internationalShipping: "120",
        domesticTrackingNumber: "SF123456_UPDATED",
        internationalTrackingNumber: "DHL789012_UPDATED",
        itemType: "鞋子",
        itemBrand: "Nike",
        itemCondition: "全新",
        purchasePrice: "600",
        purchaseDate: "2024-01-01",
        orderStatus: "在途（国内）",
        purchasePlatform: "95分",
        itemMfgDate: "2023年春季_UPDATED",
        itemColor: "黑色",
        itemSize: "42",
        itemRemarks: "更新后的测试备注",
        shipping: "",
        purchasePriceCurrency: "CNY",
        purchasePriceExchangeRate: "1",
        itemGrossProfit: "0",
        itemNetProfit: "0",
        position: "",
        warehousePositionId: "",
        launchDate: "2024-02-01",
        storageDuration: "0",
        listingPlatforms: [],
        isReturn: false,
        soldDate: "2024-03-01",
        soldPrice: "800",
        soldPlatform: "Mercari",
        soldPriceCurrency: "JPY",
        soldPriceExchangeRate: "0.06",
        photos: [],
        otherFees: [
          {
            id: "1",
            type: "包装费",
            amount: "8",
            currency: "CNY",
            description: "更新后的包装材料费用"
          }
        ]
      };

      console.log("发送更新数据:", testData);

      const response = await fetch("/api/items/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testData),
      });

      const data = await response.json();
      setResult(data);
      
      if (response.ok) {
        alert("更新成功！");
      } else {
        alert("更新失败：" + data.error);
      }
    } catch (error) {
      console.error("测试失败:", error);
      alert("测试失败：" + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">API 测试页面</h1>
      
      <div className="space-y-4">
        <Button onClick={testCreate} disabled={loading}>
          {loading ? "测试中..." : "测试创建商品"}
        </Button>
        
        <Button onClick={testUpdate} disabled={loading}>
          {loading ? "测试中..." : "测试更新商品"}
        </Button>
      </div>

      {result && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">测试结果：</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 