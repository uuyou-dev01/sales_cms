"use client";

import * as React from "react";
import { EmojiIcons } from "@/components/emoji-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Upload, Download, RefreshCw } from "lucide-react";
import BatchImport from "@/components/batch-import";

export default function TestImportPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: "1",
        pageSize: "10",
        ...(searchQuery ? { search: searchQuery } : {}),
      });
      
      const response = await fetch(`/api/items/list?${params.toString()}`);
      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      console.error("搜索失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const downloadSampleCSV = () => {
    const csvContent = `itemName,itemNumber,itemType,itemBrand,itemCondition,itemSize,itemColor,itemRemarks,itemStatus,itemMfgDate,position,warehouseName,warehouseDescription,positionName,positionCapacity,photos,purchaseDate,purchasePrice,purchasePlatform,purchasePriceCurrency,purchasePriceExchangeRate,launchDate,soldDate,soldPrice,soldPlatform,soldPriceCurrency,soldPriceExchangeRate,itemGrossProfit,itemNetProfit,shipping,transactionStatues,isReturn,storageDuration,domesticShipping,internationalShipping,domesticTrackingNumber,internationalTrackingNumber,listingPlatforms,otherFees
示例商品1,SN001,鞋子,Nike,全新,42,黑色,测试备注,在途（国内）,2023年春季,位置描述,测试仓库,测试仓库描述,A区,30,test1.jpg;test2.jpg,2024-01-01,1000.00,95分,CNY,1,2024-01-05,2024-01-15,1200.00,Mercari,JPY,0.05,200.00,180.00,20.00,未上架,no,0,10,100,SF123456,DHL789012,"Mercari,闲鱼","包装费:5:CNY:包装材料费用"
示例商品2,SN002,服装,Adidas,九成新,L,白色,无备注,在途（国内）,2023年春季,位置描述,测试仓库2,测试仓库2描述,B区,20,test3.jpg,2024-01-02,500.00,闲鱼,CNY,1,2024-01-03,2024-01-20,600.00,闲鱼,JPY,0.05,100.00,90.00,10.00,未上架,no,0,15,120,SF789012,DHL123456,"闲鱼","包装费:8:CNY:包装材料费用"`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', '测试导入数据.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">功能测试页面</h1>
        <Button onClick={() => window.location.href = "/sales"}>
          返回销售管理
        </Button>
      </div>

      {/* 批量导入测试 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-lg">{EmojiIcons.Upload}</span>
            批量导入功能测试
          </CardTitle>
          <CardDescription>
            测试CSV文件批量导入功能，包括文件验证、进度显示和错误处理
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <BatchImport />
            <Button variant="outline" onClick={downloadSampleCSV} className="gap-2">
              <span className="text-lg">{EmojiIcons.Download}</span>
              下载测试数据
            </Button>
          </div>
          <div className="text-sm text-gray-600">
            <p>• 支持CSV格式文件上传</p>
            <p>• 自动验证文件格式和必需字段（itemName、itemType、itemBrand）</p>
            <p>• 自动生成唯一商品ID</p>
            <p>• 实时显示导入进度</p>
            <p>• 详细的错误报告和成功统计</p>
            <p>• 支持仓库和仓位自动创建</p>
            <p>• 照片字段使用分号(;)分隔</p>
          </div>
        </CardContent>
      </Card>

      {/* 搜索功能测试 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-lg">{EmojiIcons.Search}</span>
            搜索功能测试
          </CardTitle>
          <CardDescription>
            测试商品搜索功能，支持多字段模糊搜索
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="搜索商品名称、ID、品牌、类型、尺寸..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading} className="gap-2">
              {loading ? <span className="text-lg">{EmojiIcons.RefreshCw}</span> : <span className="text-lg">{EmojiIcons.Search}</span>}
              搜索
            </Button>
          </div>
          
          {items.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">搜索结果 ({items.length} 条)</h4>
              <div className="grid gap-2">
                {items.map((item: Record<string, string>) => (
                  <div key={item.itemId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{item.itemName}</div>
                      <div className="text-sm text-gray-500">ID: {item.itemId}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{item.itemStatus}</Badge>
                      <span className="text-sm text-gray-600">{item.itemSize}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="text-sm text-gray-600">
            <p>• 支持商品名称、ID、品牌、类型、尺寸的模糊搜索</p>
            <p>• 实时搜索结果展示</p>
            <p>• 搜索条件与筛选器组合使用</p>
          </div>
        </CardContent>
      </Card>

      {/* API测试 */}
      <Card>
        <CardHeader>
          <CardTitle>API接口测试</CardTitle>
          <CardDescription>
            测试各个API接口的响应情况
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const response = await fetch("/api/items/stats");
                  const data = await response.json();
                  alert(`统计API响应: ${JSON.stringify(data, null, 2)}`);
                } catch (error) {
                  alert(`统计API错误: ${error}`);
                }
              }}
            >
              测试统计API
            </Button>
            
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const response = await fetch("/api/items/list?page=1&pageSize=5");
                  const data = await response.json();
                  alert(`列表API响应: ${JSON.stringify(data, null, 2)}`);
                } catch (error) {
                  alert(`列表API错误: ${error}`);
                }
              }}
            >
              测试列表API
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 