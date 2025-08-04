"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImportResult {
  success: boolean;
  importedCount: number;
  errors: Array<{
    row: number;
    error: string;
    data: Record<string, string>;
  }>;
  summary: {
    totalRows: number;
    successCount: number;
    errorCount: number;
  };
}

export default function BatchImport() {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [result, setResult] = React.useState<ImportResult | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === "text/csv" || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setResult(null);
      } else {
        toast({
          title: "文件格式错误",
          description: "请选择CSV格式的文件",
          variant: "destructive",
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "请选择文件",
        description: "请先选择一个CSV文件",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // 模拟进度
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch("/api/items/batch-import", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        if (data.summary.successCount > 0) {
          toast({
            title: "导入成功",
            description: `成功导入 ${data.summary.successCount} 条记录`,
          });
        }
        if (data.summary.errorCount > 0) {
          toast({
            title: "导入完成",
            description: `成功 ${data.summary.successCount} 条，失败 ${data.summary.errorCount} 条`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "导入失败",
          description: data.error || "未知错误",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "导入失败",
        description: error instanceof Error ? error.message : "网络错误",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `itemId,itemName,itemNumber,itemType,itemBrand,itemCondition,itemSize,itemColor,itemRemarks,itemStatus,itemMfgDate,position,warehouseName,warehouseDescription,positionName,positionCapacity,photos,purchaseDate,purchasePrice,purchasePlatform,purchasePriceCurrency,purchasePriceExchangeRate,launchDate,soldDate,soldPrice,soldPlatform,soldPriceCurrency,soldPriceExchangeRate,itemGrossProfit,itemNetProfit,shipping,transactionStatues,isReturn,storageDuration,domesticShipping,internationalShipping,domesticTrackingNumber,internationalTrackingNumber,listingPlatforms,otherFees
ITEM001,示例商品1,SN001,鞋子,Nike,全新,42,黑色,备注信息,在途（国内）,2023年春季,位置描述,家庭仓,家庭仓库,A区,30,photo1.jpg,photo2.jpg,2024-01-01,1000.00,95分,CNY,1,2024-01-05,2024-01-15,1200.00,Mercari,JPY,0.05,200.00,180.00,20.00,未上架,no,0,10,100,SF123456,DHL789012,"Mercari,闲鱼","包装费:5:CNY:包装材料费用"
ITEM002,示例商品2,SN002,服装,Adidas,九成新,L,白色,无备注,在途（国内）,2023年春季,位置描述,办公间,办公室仓库,B区,20,photo3.jpg,2024-01-02,500.00,闲鱼,CNY,1,2024-01-03,2024-01-20,600.00,闲鱼,JPY,0.05,100.00,90.00,10.00,未上架,no,0,15,120,SF789012,DHL123456,"闲鱼","包装费:8:CNY:包装材料费用"`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', '商品导入模板.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="w-4 h-4" />
          批量导入
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            批量导入商品
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 说明信息 */}
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>必填字段：</strong>itemId、itemName、itemType、itemBrand</p>
                <p><strong>仓库功能：</strong>如果填写warehouseName和positionName，系统会自动创建仓库和仓位</p>
                <p><strong>照片上传：</strong>photos字段支持多个照片，用逗号分隔</p>
                <p><strong>日期格式：</strong>YYYY-MM-DD（如：2024-01-01）</p>
                <p><strong>上架平台：</strong>listingPlatforms字段用逗号分隔多个平台（如：Mercari,闲鱼）</p>
                <p><strong>其他费用：</strong>otherFees字段格式为类型:金额:货币:描述，多个费用用逗号分隔</p>
                <p><strong>运费字段：</strong>domesticShipping（国内运费）、internationalShipping（国际运费）</p>
                <p><strong>单号字段：</strong>domesticTrackingNumber（国内单号）、internationalTrackingNumber（国际单号）</p>
              </div>
            </AlertDescription>
          </Alert>

          {/* 文件上传区域 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="file">选择CSV文件</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                下载模板
              </Button>
            </div>
            
            <Input
              id="file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={uploading}
            />
            
            {file && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="w-4 h-4" />
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          {/* 进度条 */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>正在导入...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* 导入结果 */}
          {result && (
            <div className="space-y-4">
              <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <AlertDescription>
                    总计: {result.summary.totalRows} 条 | 
                    成功: {result.summary.successCount} 条 | 
                    失败: {result.summary.errorCount} 条
                  </AlertDescription>
                </div>
              </Alert>

              {/* 错误详情 */}
              {result.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">错误详情</h4>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {result.errors.slice(0, 5).map((error, index) => (
                      <Alert key={index} className="border-red-200 bg-red-50">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <AlertDescription>
                          第 {error.row} 行: {error.error}
                        </AlertDescription>
                      </Alert>
                    ))}
                    {result.errors.length > 5 && (
                      <div className="text-sm text-gray-500">
                        还有 {result.errors.length - 5} 个错误...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setFile(null);
                setResult(null);
                setProgress(0);
              }}
            >
              关闭
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="gap-2"
            >
              {uploading ? "导入中..." : "开始导入"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 