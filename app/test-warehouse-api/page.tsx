"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";

export default function TestWarehouseAPI() {
  const [result, setResult] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);

  const testAPI = async () => {
    setLoading(true);
    setResult("");
    
    try {
      console.log("开始测试仓库API...");
      const response = await fetch("/api/warehouses");
      console.log("API响应:", response);
      
      const status = response.status;
      const text = await response.text();
      console.log("响应文本:", text);
      
      let data;
      try {
        data = JSON.parse(text);
        console.log("解析后的数据:", data);
      } catch (e) {
        console.error("JSON解析失败:", e);
        data = { raw: text, parseError: e.message };
      }
      
      const resultObj = {
        status,
        ok: response.ok,
        contentType: response.headers.get('content-type'),
        data,
        dataLength: Array.isArray(data) ? data.length : 'not array',
        hasPositions: Array.isArray(data) ? data.some(w => w.positions && w.positions.length > 0) : false
      };
      
      setResult(JSON.stringify(resultObj, null, 2));
      console.log("测试结果:", resultObj);
    } catch (error) {
      console.error("测试失败:", error);
      setResult(`错误: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">仓库API测试</h1>
      
      <Button onClick={testAPI} disabled={loading} className="mb-4">
        {loading ? "测试中..." : "测试仓库API"}
      </Button>
      
      {result && (
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">API测试结果:</h2>
          <pre className="text-sm overflow-auto whitespace-pre-wrap">
            {result}
          </pre>
        </div>
      )}
      
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">测试说明:</h3>
        <ul className="text-sm space-y-1">
          <li>• 点击按钮测试仓库API</li>
          <li>• 查看控制台输出</li>
          <li>• 检查API是否返回数据</li>
          <li>• 验证数据结构是否正确</li>
        </ul>
      </div>
    </div>
  );
}
