import React from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

export function CSVUpload() {
  const { toast } = useToast();
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "错误",
        description: "请上传 CSV 文件",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      setProgress(0);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/csv/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '上传失败');
      }

      const result = await response.json();
      
      toast({
        title: "上传成功",
        description: `成功导入 ${result.importedCount} 条数据`,
      });

      // 重置文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "上传失败",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProgress(100);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>数据导入</CardTitle>
        <CardDescription>上传 CSV 文件导入商品数据</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleUpload}
              disabled={uploading}
              className="max-w-sm"
            />
            {uploading && <Progress value={progress} className="w-[60px]" />}
          </div>
          <div className="text-sm text-muted-foreground">
            <p>CSV 文件格式要求：</p>
            <ul className="list-disc list-inside">
              <li>必须包含表头</li>
              <li>必须包含：商品ID、商品名称、品牌、类型等必填字段</li>
              <li>日期格式：YYYY-MM-DD</li>
              <li>价格格式：数字</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 