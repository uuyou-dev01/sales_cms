"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Eye, Edit, Trash2 } from "lucide-react";

export default function TestDialogPage() {
  const [detailItem, setDetailItem] = React.useState<Record<string, any> | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false);

  const testItems = [
    {
      itemId: "TEST001",
      itemName: "测试商品1",
      itemBrand: "测试品牌",
      itemType: "电子产品",
      itemCondition: "全新",
      itemSize: "M",
      itemColor: "黑色",
      itemStatus: "pending",
      itemRemarks: "这是一个测试商品",
      transactions: [{
        purchaseDate: "2024-01-01",
        purchaseAmount: "1000.00",
        soldPrice: "1200.00",
        itemNetProfit: "180.00"
      }]
    },
    {
      itemId: "TEST002", 
      itemName: "测试商品2",
      itemBrand: "测试品牌2",
      itemType: "服装",
      itemCondition: "九成新",
      itemSize: "L",
      itemColor: "白色",
      itemStatus: "completed",
      itemRemarks: "这是另一个测试商品",
      transactions: [{
        purchaseDate: "2024-01-02",
        purchaseAmount: "500.00",
        soldPrice: "600.00",
        itemNetProfit: "90.00"
      }]
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dialog功能测试</h1>
        <Button onClick={() => window.location.href = "/sales"}>
          返回销售管理
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dialog测试说明</CardTitle>
          <CardDescription>
            测试Dialog打开和关闭后页面元素是否仍然可以正常点击
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            {testItems.map((item) => (
              <div key={item.itemId} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">{item.itemName}</div>
                  <div className="text-sm text-gray-500">ID: {item.itemId}</div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDetailItem(item);
                      setDetailDialogOpen(true);
                    }}
                    className="gap-2"
                  >
                    <span className="text-lg">{EmojiIcons.Eye}</span>
                    查看详情
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <span className="text-lg">{EmojiIcons.Edit}</span>
                    编辑
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <span className="text-lg">{EmojiIcons.Trash2}</span>
                    删除
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>页面交互测试</CardTitle>
          <CardDescription>
            点击这些按钮测试页面交互是否正常
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button onClick={() => alert("按钮1点击成功！")}>
              测试按钮1
            </Button>
            <Button variant="outline" onClick={() => alert("按钮2点击成功！")}>
              测试按钮2
            </Button>
            <Button variant="secondary" onClick={() => alert("按钮3点击成功！")}>
              测试按钮3
            </Button>
            <Button variant="destructive" onClick={() => alert("按钮4点击成功！")}>
              测试按钮4
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 详情对话框 */}
      <Dialog open={detailDialogOpen} onOpenChange={(open) => {
        setDetailDialogOpen(open);
        if (!open) {
          setDetailItem(null);
          // 强制清理body的pointer-events
          setTimeout(() => {
            document.body.style.pointerEvents = 'auto';
          }, 100);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">{EmojiIcons.Package}</span>
              商品详情
            </DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-xl text-gray-900 mb-2">{detailItem.itemName}</h3>
                <p className="text-sm text-gray-600">商品编号：{detailItem.itemId}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">品牌：</span>
                    <span className="font-medium">{detailItem.itemBrand || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">类型：</span>
                    <span className="font-medium">{detailItem.itemType || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">成色：</span>
                    <span className="font-medium">{detailItem.itemCondition || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">尺寸：</span>
                    <span className="font-medium">{detailItem.itemSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">颜色：</span>
                    <span className="font-medium">{detailItem.itemColor || '-'}</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">状态：</span>
                    <span className="font-medium">{detailItem.itemStatus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">购入时间：</span>
                    <span className="font-medium">
                      {detailItem.transactions?.[0]?.purchaseDate || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">购入价格：</span>
                    <span className="font-medium text-green-600">
                      ¥{detailItem.transactions?.[0]?.purchaseAmount || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">售出价格：</span>
                    <span className="font-medium text-blue-600">
                      ¥{detailItem.transactions?.[0]?.soldPrice || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">净利润：</span>
                    <span className="font-medium text-purple-600">
                      ¥{detailItem.transactions?.[0]?.itemNetProfit || '-'}
                    </span>
                  </div>
                </div>
              </div>
              
              {detailItem.itemRemarks && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-2">备注</h4>
                  <p className="text-gray-600 text-sm">{detailItem.itemRemarks}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 