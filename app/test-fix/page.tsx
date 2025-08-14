"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { SafeDialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/safe-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Eye, AlertCircle } from "lucide-react";

export default function TestFixPage() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [bodyPointerEvents, setBodyPointerEvents] = React.useState<string>("");

  // 检查body的pointer-events状态
  const checkBodyPointerEvents = () => {
    const currentValue = document.body.style.pointerEvents || "auto";
    setBodyPointerEvents(currentValue);
    console.log("Body pointer-events:", currentValue);
  };

  // 强制修复body的pointer-events
  const fixBodyPointerEvents = () => {
    document.body.style.pointerEvents = "auto";
    checkBodyPointerEvents();
  };

  React.useEffect(() => {
    // 页面加载时检查
    checkBodyPointerEvents();
    
    // 每秒检查一次
    const interval = setInterval(checkBodyPointerEvents, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Body Pointer-Events 修复测试</h1>
        <Button onClick={() => window.location.href = "/sales"}>
          返回销售管理
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-lg">{EmojiIcons.AlertCircle}</span>
            当前状态
          </CardTitle>
          <CardDescription>
            实时监控body元素的pointer-events状态
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Body Pointer-Events 状态</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">当前值:</span>
                <span className={`px-2 py-1 rounded text-sm font-mono ${
                  bodyPointerEvents === "none" 
                    ? "bg-red-100 text-red-800" 
                    : "bg-green-100 text-green-800"
                }`}>
                  {bodyPointerEvents || "auto"}
                </span>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">页面交互状态</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">状态:</span>
                <span className={`px-2 py-1 rounded text-sm ${
                  bodyPointerEvents === "none" 
                    ? "bg-red-100 text-red-800" 
                    : "bg-green-100 text-green-800"
                }`}>
                  {bodyPointerEvents === "none" ? "❌ 无法点击" : "✅ 正常"}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={checkBodyPointerEvents} variant="outline">
              检查状态
            </Button>
            <Button onClick={fixBodyPointerEvents} variant="outline">
              强制修复
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dialog测试</CardTitle>
          <CardDescription>
            点击打开Dialog，然后关闭，观察body状态是否正常
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={() => setDialogOpen(true)}
            className="gap-2"
          >
            <span className="text-lg">{EmojiIcons.Eye}</span>
            打开Dialog
          </Button>
          
          <div className="text-sm text-gray-600">
            <p>• 点击"打开Dialog"按钮</p>
            <p>• 在Dialog中点击"关闭"按钮</p>
            <p>• 观察上方状态是否恢复正常</p>
            <p>• 测试下方按钮是否可以点击</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>页面交互测试</CardTitle>
          <CardDescription>
            这些按钮应该始终可以点击
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

      {/* 测试Dialog */}
      <SafeDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">{EmojiIcons.Package}</span>
              测试Dialog
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>这是一个测试Dialog，用于验证body pointer-events问题是否已修复。</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                关闭
              </Button>
            </div>
          </div>
        </DialogContent>
      </SafeDialog>
    </div>
  );
} 