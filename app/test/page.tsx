"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">动态路由测试</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">测试链接：</h2>
          <div className="space-y-2">
            <Link href="/sales">
              <Button variant="outline">全部销售数据</Button>
            </Link>
          </div>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-2">月份测试：</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/sales/2024-01">
              <Button variant="outline">2024年1月</Button>
            </Link>
            <Link href="/sales/2024-02">
              <Button variant="outline">2024年2月</Button>
            </Link>
            <Link href="/sales/2024-03">
              <Button variant="outline">2024年3月</Button>
            </Link>
            <Link href="/sales/2024-06">
              <Button variant="outline">2024年6月</Button>
            </Link>
            <Link href="/sales/2024-12">
              <Button variant="outline">2024年12月</Button>
            </Link>
          </div>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-2">API测试：</h2>
          <div className="space-y-2">
            <Link href="/api/items/months">
              <Button variant="outline">获取月份列表</Button>
            </Link>
            <Link href="/api/items/stats">
              <Button variant="outline">获取统计数据</Button>
            </Link>
            <Link href="/api/items/stats?start=2024-01-01&end=2024-01-31">
              <Button variant="outline">获取2024年1月统计</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 