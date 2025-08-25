"use client";

import { useState } from "react";
import { ExportDialog } from "@/components/export-dialog";
import { Button } from "@/components/ui/button";
import { EmojiIcons } from "@/components/emoji-icons";

export default function TestExportPage() {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
          <span className="text-lg">{EmojiIcons.Download}</span>
          导出功能测试页面
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">测试导出功能</h2>
          <p className="text-gray-600 mb-6">
            点击下面的按钮测试导出功能，可以选择不同的数据范围进行导出。
          </p>
          
          <Button
            onClick={() => setExportDialogOpen(true)}
            className="gap-2"
            size="lg"
          >
            <span className="text-lg">{EmojiIcons.Download}</span>
            测试导出功能
          </Button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h3 className="font-medium text-blue-800 mb-2">功能说明：</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 支持导出全部数据</li>
            <li>• 支持导出当月数据</li>
            <li>• 支持导出指定日期范围的数据</li>
            <li>• 自动生成带时间戳的文件名</li>
            <li>• 包含完整的商品和交易信息</li>
          </ul>
        </div>
      </div>

      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
      />
    </div>
  );
}
