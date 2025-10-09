"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SafeDialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/safe-dialog";
import { DialogTrigger } from "@/components/ui/dialog";
import { Package, TrendingUp, Copy, Download, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ItemCount {
  name: string;
  count: number;
  sourceLines: number[]; // 记录该商品出现在哪些行
}

export function InventoryCounter() {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [inputText, setInputText] = React.useState("");
  const [results, setResults] = React.useState<ItemCount[]>([]);
  const [highlightedLines, setHighlightedLines] = React.useState<Set<number>>(new Set());
  const [selectedItemName, setSelectedItemName] = React.useState<string>("");
  const [isAnalyzed, setIsAnalyzed] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const displayRef = React.useRef<HTMLDivElement>(null);

  const parseInventory = (text: string) => {
    const itemMap = new Map<string, { count: number; lines: Set<number> }>();
    
    // 按行分割
    const lines = text.split('\n').filter(line => line.trim());
    
    lines.forEach((line, lineIndex) => {
      // 处理每一行，按 + 分割多个商品
      const items = line.split('+').map(item => item.trim());
      
      items.forEach(item => {
        if (!item) return;
        
        // 移除前后空格
        item = item.trim();
        
        // 匹配数量模式：
        // 1. "商品名*数字" 或 "商品名 *数字"
        // 2. "商品名 数字" (仅当数字单独存在)
        let itemName = item;
        let quantity = 1;
        
        // 模式1: 商品名*数字 或 商品名 *数字
        const pattern1 = /^(.+?)\s*[*×]\s*(\d+)$/;
        const match1 = item.match(pattern1);
        
        if (match1) {
          itemName = match1[1].trim();
          quantity = parseInt(match1[2]);
        } else {
          // 模式2: 商品名 数字 (最后是单独的数字)
          const pattern2 = /^(.+?)\s+(\d+)$/;
          const match2 = item.match(pattern2);
          
          if (match2) {
            // 检查是否是商品名的一部分（如"12星座"）
            const potentialName = match2[1].trim();
            const potentialQty = parseInt(match2[2]);
            
            // 如果数字小于等于20，很可能是数量
            if (potentialQty <= 20) {
              itemName = potentialName;
              quantity = potentialQty;
            }
          }
        }
        
        // 清理商品名（移除多余的空格和特殊字符）
        itemName = itemName.trim().replace(/\s+/g, ' ');
        
        // 跳过空商品名
        if (!itemName) return;
        
        // 累加数量并记录行号
        const existing = itemMap.get(itemName) || { count: 0, lines: new Set<number>() };
        existing.count += quantity;
        existing.lines.add(lineIndex);
        itemMap.set(itemName, existing);
      });
    });
    
    // 转换为数组并按数量排序
    const resultArray: ItemCount[] = Array.from(itemMap.entries())
      .map(([name, data]) => ({ 
        name, 
        count: data.count,
        sourceLines: Array.from(data.lines)
      }))
      .sort((a, b) => b.count - a.count);
    
    return resultArray;
  };

  const handleAnalyze = () => {
    if (!inputText.trim()) {
      toast({
        title: "请输入内容",
        description: "请在文本框中输入需要统计的商品信息",
        variant: "destructive",
      });
      return;
    }
    
    const parsed = parseInventory(inputText);
    setResults(parsed);
    setIsAnalyzed(true);
    
    toast({
      title: "统计完成",
      description: `共识别出 ${parsed.length} 种商品`,
    });
  };

  const handleClear = () => {
    setInputText("");
    setResults([]);
    setHighlightedLines(new Set());
    setSelectedItemName("");
    setIsAnalyzed(false);
  };

  const handleItemClick = (item: ItemCount) => {
    // 设置高亮行和选中的商品名
    setHighlightedLines(new Set(item.sourceLines));
    setSelectedItemName(item.name);
    
    // 滚动到第一个出现的行
    const scrollTarget = isAnalyzed ? displayRef.current : textareaRef.current;
    if (scrollTarget && item.sourceLines.length > 0) {
      const firstLine = item.sourceLines[0];
      
      // 计算滚动位置
      const lineHeight = 24; // 1.5rem = 24px
      scrollTarget.scrollTop = firstLine * lineHeight;
    }
    
    toast({
      title: "已高亮显示",
      description: `${item.name} 出现在第 ${item.sourceLines.map(l => l + 1).join(', ')} 行`,
    });
  };

  const handleCopyResults = () => {
    if (results.length === 0) {
      toast({
        title: "无内容可复制",
        variant: "destructive",
      });
      return;
    }
    
    const totalItems = results.reduce((sum, item) => sum + item.count, 0);
    let copyText = `商品统计结果\n总计 ${results.length} 种商品，共 ${totalItems} 件\n\n`;
    copyText += results.map((item, index) => 
      `${index + 1}. ${item.name}: ${item.count}件`
    ).join('\n');
    
    navigator.clipboard.writeText(copyText);
    toast({
      title: "复制成功",
      description: "统计结果已复制到剪贴板",
    });
  };

  const handleExport = () => {
    if (results.length === 0) {
      toast({
        title: "无内容可导出",
        variant: "destructive",
      });
      return;
    }
    
    const totalItems = results.reduce((sum, item) => sum + item.count, 0);
    let csvContent = "序号,商品名称,数量\n";
    results.forEach((item, index) => {
      csvContent += `${index + 1},"${item.name}",${item.count}\n`;
    });
    csvContent += `\n总计,${results.length}种,${totalItems}件`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `商品统计_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast({
      title: "导出成功",
      description: "统计结果已导出为CSV文件",
    });
  };

  const totalItems = results.reduce((sum, item) => sum + item.count, 0);

  return (
    <SafeDialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-xs"
          title="商品统计工具"
        >
          <Package className="w-4 h-4 text-purple-600" />
          <span>商品统计</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-600" />
            商品统计工具
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4">
          {/* 左侧：输入区域 */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">输入商品信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-gray-600 space-y-1">
                  <div>支持格式：</div>
                  <div>• 每行一条记录</div>
                  <div>• 用 + 分隔多个商品</div>
                  <div>• 用 *数字 表示数量（如：米奇*3）</div>
                </div>
{isAnalyzed ? (
                  /* 统计后：只读高亮显示区域 */
                  <div 
                    ref={displayRef}
                    className="border rounded-md p-3 font-mono text-sm bg-gray-50 overflow-auto max-h-96"
                  >
                    {inputText.split('\n').map((line, index) => (
                      <div
                        key={index}
                        className={`min-h-[1.5rem] leading-6 px-2 py-0.5 transition-colors ${
                          highlightedLines.has(index)
                            ? 'bg-blue-300 bg-opacity-70 rounded'
                            : ''
                        }`}
                      >
                        {line || '\u00A0'}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* 统计前：可编辑输入框 */
                  <Textarea
                    ref={textareaRef}
                    placeholder="粘贴商品信息...&#10;例如：&#10;米奇+米妮*2&#10;库洛米*3&#10;小蛋糕耳机包"
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value);
                    }}
                    rows={15}
                    className="font-mono text-sm"
                  />
                )}
                <div className="flex gap-2">
                  {isAnalyzed ? (
                    <>
                      <Button variant="outline" onClick={() => setIsAnalyzed(false)} className="flex-1">
                        <Edit className="w-4 h-4 mr-2" />
                        重新编辑
                      </Button>
                      <Button variant="outline" onClick={handleClear}>
                        清空
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={handleAnalyze} className="flex-1">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        开始统计
                      </Button>
                      <Button variant="outline" onClick={handleClear}>
                        清空
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：统计结果 */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>统计结果</span>
                  {results.length > 0 && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handleCopyResults}>
                        <Copy className="w-3 h-3 mr-1" />
                        复制
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleExport}>
                        <Download className="w-3 h-3 mr-1" />
                        导出
                      </Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {results.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <div>输入商品信息后点击"开始统计"</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* 总计 */}
                    <Card className="bg-purple-50 border-purple-200">
                      <CardContent className="p-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-purple-800 font-medium">总计</span>
                          <div className="text-right">
                            <div className="text-purple-800 font-bold">{results.length} 种商品</div>
                            <div className="text-purple-600 text-xs">{totalItems} 件</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* 商品列表 */}
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {results.map((item, index) => (
                        <Card 
                          key={index} 
                          className={`border border-gray-200 cursor-pointer transition-all hover:shadow-md hover:border-purple-300 ${
                            selectedItemName === item.name
                              ? 'bg-purple-50 border-purple-400'
                              : ''
                          }`}
                          onClick={() => handleItemClick(item)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500 font-mono w-6">#{index + 1}</span>
                                  <span className="text-sm font-medium">{item.name}</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  出现在第 {item.sourceLines.map(l => l + 1).join(', ')} 行
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-purple-600">{item.count}</div>
                                <div className="text-xs text-gray-500">件</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </SafeDialog>
  );
}

