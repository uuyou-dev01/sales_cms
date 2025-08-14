"use client";

import { useState } from "react";
import { EmojiIcons } from "@/components/emoji-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, AlertTriangle } from "lucide-react";

export default function TestClearDatabase() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    timestamp?: string;
  } | null>(null);

  const handleClearDatabase = async () => {
    if (!confirm("⚠️ 警告：这将删除数据库中的所有数据！\n\n此操作不可逆，请确认您真的要清空数据库吗？")) {
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      // 第一步：清空数据库
      const clearResponse = await fetch("/api/debug/clear-database", {
        method: "POST",
      });

      const clearData = await clearResponse.json();
      
      if (clearData.success) {
        // 第二步：清除缓存
        const cacheResponse = await fetch("/api/debug/clear-cache", {
          method: "POST",
        });

        const cacheData = await cacheResponse.json();
        
        setResult({
          success: true,
          message: `${clearData.message}\n${cacheData.message}`,
          timestamp: new Date().toISOString()
        });
      } else {
        setResult(clearData);
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "请求失败",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card className="border-red-200">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-lg">{EmojiIcons.Trash2}</span>
          </div>
          <CardTitle className="text-red-700">清空数据库</CardTitle>
          <CardDescription className="text-red-600">
            危险操作 - 此操作将删除所有数据且不可恢复
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>⚠️ 重要提醒：</strong>
              <br />
              • 此操作将删除数据库中的所有商品、交易、仓库和仓位数据
              <br />
              • 删除后数据无法恢复
              <br />
              • 请确保您已经备份了重要数据
              <br />
              • 此操作仅用于开发和测试环境
            </AlertDescription>
          </Alert>

          <div className="flex justify-center gap-4">
            <Button
              onClick={handleClearDatabase}
              disabled={isLoading}
              variant="destructive"
              size="lg"
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  正在清空...
                </>
              ) : (
                <>
                  <span className="text-lg">{EmojiIcons.Trash2}</span>
                  确认清空数据库
                </>
              )}
            </Button>
            
            <Button
              onClick={async () => {
                setIsLoading(true);
                try {
                  const response = await fetch("/api/debug/clear-cache", { method: "POST" });
                  const data = await response.json();
                  setResult(data);
                } catch (error) {
                  setResult({
                    success: false,
                    error: error instanceof Error ? error.message : "清除缓存失败",
                  });
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              🔄 仅清除缓存
            </Button>
          </div>

          {result && (
            <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
                <strong>{result.success ? "✅ 成功" : "❌ 失败"}</strong>
                <br />
                {result.message || result.error}
                {result.timestamp && (
                  <>
                    <br />
                    <span className="text-sm opacity-75">
                      时间: {new Date(result.timestamp).toLocaleString('zh-CN')}
                    </span>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
