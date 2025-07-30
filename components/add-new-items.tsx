"use client";

import * as React from "react";
import { CalendarIcon, Package, ShoppingCart, DollarSign, MapPin, Camera, Trash2, Edit, Plus, Tag, Palette, Ruler, Hash, FileText, Globe, TrendingUp, Warehouse, Truck, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { Separator } from "@/components/ui/separator";
import { PricePrediction } from "@/components/price-prediction";
import { WarehouseSelector } from "@/components/warehouse-selector";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";

// 根据Prisma schema定义表单验证规则
const formSchema = z.object({
  // Item 表字段
  itemId: z.string().optional(),
  itemName: z.string().min(1, "商品名不能为空"),
  itemMfgDate: z.date().optional(),
  itemNumber: z.string().optional(),
  itemType: z.string().min(1, "请选择商品类型"),
  itemBrand: z.string().min(1, "品牌不能为空"),
  itemCondition: z.string().min(1, "请选择商品成色"),
  itemRemarks: z.string().optional(),
  itemColor: z.string().optional(),
  itemStatus: z.string().min(1, "请选择商品状态"),
  itemSize: z.string().optional(),
  position: z.string().optional(),
  photos: z.array(z.string()).optional(),
  warehousePositionId: z.string().optional(),
  
  // Transaction 表字段
  shipping: z.string().optional(),
  transactionStatues: z.string().optional(),
  purchaseDate: z.date().optional(),
  soldDate: z.date().nullable().optional(),
  purchaseAmount: z.string().optional(),
  launchDate: z.date().nullable().optional(),
  purchasePlatform: z.string().optional(),
  soldPlatform: z.string().optional(),
  purchasePrice: z.string().optional(),
  purchasePriceCurrency: z.string().optional(),
  purchasePriceExchangeRate: z.string().optional(),
  soldPrice: z.string().optional(),
  soldPriceCurrency: z.string().optional(),
  soldPriceExchangeRate: z.string().optional(),
  itemGrossProfit: z.string().optional(),
  itemNetProfit: z.string().optional(),
  isReturn: z.boolean().optional(),
  returnFee: z.string().optional(),
  storageDuration: z.string().optional(),
});

interface FormData {
  // Item 表字段
  itemId?: string;
  itemName: string;
  itemMfgDate?: Date;
  itemNumber?: string;
  itemType: string;
  itemBrand: string;
  itemCondition: string;
  itemRemarks?: string;
  itemColor?: string;
  itemStatus: string;
  itemSize?: string;
  position?: string;
  photos?: string[];
  warehousePositionId?: string;
  
  // Transaction 表字段
  shipping?: string;
  transactionStatues?: string;
  purchaseDate?: Date;
  soldDate?: Date | null;
  purchaseAmount?: string;
  launchDate?: Date | null;
  purchasePlatform?: string;
  soldPlatform?: string;
  purchasePrice?: string;
  purchasePriceCurrency?: string;
  purchasePriceExchangeRate?: string;
  soldPrice?: string;
  soldPriceCurrency?: string;
  soldPriceExchangeRate?: string;
  itemGrossProfit?: string;
  itemNetProfit?: string;
  isReturn?: boolean;
  returnFee?: string;
  storageDuration?: string;
}

// 新增：不包含Dialog的表单组件，用于在现有Dialog内部使用
export function TransactionForm({ existingData = null, onSuccess }: { existingData?: FormData | null, onSuccess?: () => void }) {
  const { toast } = useToast();
  
  // 生成简单的商品ID
  const generateItemId = () => {
    const timestamp = Date.now().toString().slice(-6); // 取时间戳后6位
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0'); // 3位随机数
    return `ITEM${timestamp}${random}`;
  };

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: existingData || {
      // Item 表字段
      itemId: generateItemId(), // 预生成商品ID
      itemName: "",
      itemMfgDate: new Date(),
      itemNumber: "",
      itemType: "",
      itemBrand: "",
      itemCondition: "",
      itemRemarks: "",
      itemColor: "",
      itemStatus: "pending",
      itemSize: "",
      position: "",
      photos: [],
      
      // Transaction 表字段
      shipping: "100",
      transactionStatues: "pending",
      purchaseDate: new Date(),
      soldDate: null,
      purchaseAmount: "0",
      launchDate: null,
      purchasePlatform: "",
      soldPlatform: "",
      purchasePrice: "0",
      purchasePriceCurrency: "CNY",
      purchasePriceExchangeRate: "1",
      soldPrice: "0",
      soldPriceCurrency: "CNY",
      soldPriceExchangeRate: "1",
      itemGrossProfit: "0",
      itemNetProfit: "0",
      isReturn: false,
      returnFee: "0",
      storageDuration: "0",
    },
  });

  const [uploading, setUploading] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>(existingData?.photos || []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!form.watch("purchasePriceCurrency") && !form.watch("purchasePrice")) {
      form.setValue("purchasePrice", "0");
    }
  }, [form]);

  const onPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("file", file));
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (data.urls) {
      setPhotoUrls((prev) => [...prev, ...data.urls]);
      form.setValue("photos", [...(form.getValues("photos") || []), ...data.urls]);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (data: FormData) => {
    try {
      // 商品ID已经在初始化时生成，无需再次生成

      const requestData = {
        ...data,
        photos: photoUrls,
        // 处理日期字段，确保null值被正确传递
        soldDate: data.soldDate ? data.soldDate.toISOString() : null,
        launchDate: data.launchDate ? data.launchDate.toISOString() : null,
        purchaseDate: data.purchaseDate ? data.purchaseDate.toISOString() : new Date().toISOString(),
        itemMfgDate: data.itemMfgDate ? data.itemMfgDate.toISOString() : new Date().toISOString(),
        // 处理其他字段
        purchasePrice: data.purchasePrice?.toString() || "0",
        soldPrice: data.soldPrice?.toString() || "0",
        shipping: data.shipping?.toString() || "0",
        returnFee: data.returnFee?.toString() || "0",
        itemGrossProfit: data.itemGrossProfit?.toString() || "0",
        itemNetProfit: data.itemNetProfit?.toString() || "0",
      };

      const endpoint = existingData ? '/api/items/update' : '/api/items/create';
      const response = await fetch(endpoint, {
        method: existingData ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '提交失败');
      }
      
      toast({
        title: existingData ? "更新成功" : "添加成功",
        description: "商品信息已保存",
      });
      
      // 调用成功回调
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "操作失败",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!existingData) return;
    
    try {
      const response = await fetch(`/api/items/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: existingData.itemId }),
      });
      
      if (!response.ok) throw new Error('删除失败');
      
      toast({
        title: "删除成功",
        description: "商品已删除",
      });
      
      // 调用成功回调
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "操作失败",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* 基本信息区域 */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <Package className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900">📦 基本信息</h3>
              <p className="text-sm text-blue-700">填写商品的核心信息</p>
            </div>
          </div>
          
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <FormField
              control={form.control}
              name="itemId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-gray-500" />
                    商品ID
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="商品ID" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="itemName"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-green-500" />
                    商品名称
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="请输入商品名称" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="itemBrand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <span className="text-lg">🏷️</span>
                    品牌
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="品牌名称" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="itemType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <span className="text-lg">📂</span>
                    商品类型
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择类型" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="球鞋">👟 球鞋</SelectItem>
                      <SelectItem value="衣服">👕 衣服</SelectItem>
                      <SelectItem value="配饰">💍 配饰</SelectItem>
                      <SelectItem value="箱包">👜 箱包</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="itemCondition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <span className="text-lg">⭐</span>
                    商品成色
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择成色" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="全新">✨ 全新</SelectItem>
                      <SelectItem value="9成新">🌟 9成新</SelectItem>
                      <SelectItem value="8成新">⭐ 8成新</SelectItem>
                      <SelectItem value="7成新">💫 7成新</SelectItem>
                      <SelectItem value="6成新">✨ 6成新</SelectItem>
                      <SelectItem value="5成新">⭐ 5成新</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="itemSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-purple-500" />
                    尺寸
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="尺寸规格" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="itemColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-pink-500" />
                    颜色
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="商品颜色" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="itemNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <span className="text-lg">🔢</span>
                    商品编号
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="商品编号" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="itemMfgDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-orange-500" />
                    生产日期
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>选择日期</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="itemStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <span className="text-lg">📊</span>
                    商品状态
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择状态" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">⏳ 待处理</SelectItem>
                      <SelectItem value="in_stock">📦 在库</SelectItem>
                      <SelectItem value="sold">💰 已售出</SelectItem>
                      <SelectItem value="returned">🔄 已退货</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem className="md:col-span-2">
              <FormLabel className="flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-blue-500" />
                仓库位置
              </FormLabel>
              <WarehouseSelector
                selectedWarehouseId=""
                selectedPositionId={form.watch("warehousePositionId") || ""}
                onWarehouseChange={() => {}}
                onPositionChange={(positionId) => {
                  form.setValue("warehousePositionId", positionId);
                }}
              />
            </FormItem>

            <FormField
              control={form.control}
              name="itemRemarks"
              render={({ field }) => (
                <FormItem className="md:col-span-2 lg:col-span-3">
                  <FormLabel className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    备注信息
                  </FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="商品备注信息..." rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator className="my-8" />

        {/* 交易信息区域 */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <ShoppingCart className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="text-lg font-semibold text-green-900">💰 交易信息</h3>
              <p className="text-sm text-green-700">填写购买和销售相关信息</p>
            </div>
          </div>
          
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <FormField
              control={form.control}
              name="purchaseDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-blue-500" />
                    购入日期
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>选择日期</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purchasePlatform"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-purple-500" />
                    购入平台
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="购买平台" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purchasePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    购入价格
                  </FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" placeholder="0.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purchasePriceCurrency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <span className="text-lg">💱</span>
                    购入货币
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择货币" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CNY">🇨🇳 CNY</SelectItem>
                      <SelectItem value="USD">🇺🇸 USD</SelectItem>
                      <SelectItem value="JPY">🇯🇵 JPY</SelectItem>
                      <SelectItem value="EUR">🇪🇺 EUR</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purchasePriceExchangeRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                    汇率
                  </FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.0001" placeholder="1.0000" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purchaseAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <span className="text-lg">💵</span>
                    购入金额
                  </FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" placeholder="0.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="soldDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-red-500" />
                    售出日期
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>选择日期</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="soldPlatform"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    售出平台
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="销售平台" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="soldPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    售出价格
                  </FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" placeholder="0.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="soldPriceCurrency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <span className="text-lg">💱</span>
                    售出货币
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择货币" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CNY">🇨🇳 CNY</SelectItem>
                      <SelectItem value="USD">🇺🇸 USD</SelectItem>
                      <SelectItem value="JPY">🇯🇵 JPY</SelectItem>
                      <SelectItem value="EUR">🇪🇺 EUR</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="soldPriceExchangeRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                    汇率
                  </FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.0001" placeholder="1.0000" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="itemGrossProfit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <span className="text-lg">📈</span>
                    毛利润
                  </FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" placeholder="0.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="itemNetProfit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <span className="text-lg">💰</span>
                    净利润
                  </FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" placeholder="0.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shipping"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-500" />
                    运费
                  </FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" placeholder="0.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="returnFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <span className="text-lg">🔄</span>
                    退货费用
                  </FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" placeholder="0.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="storageDuration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Warehouse className="w-4 h-4 text-gray-500" />
                    存储时长(天)
                  </FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="0" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="transactionStatues"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <span className="text-lg">📊</span>
                    交易状态
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择状态" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">⏳ 进行中</SelectItem>
                      <SelectItem value="completed">✅ 已完成</SelectItem>
                      <SelectItem value="cancelled">❌ 已取消</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isReturn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <span className="text-lg">🔄</span>
                    是否退货
                  </FormLabel>
                  <Select onValueChange={(value) => field.onChange(value === 'true')} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="false">❌ 否</SelectItem>
                      <SelectItem value="true">✅ 是</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="launchDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-purple-500" />
                    上架日期
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>选择日期</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator className="my-8" />

        {/* 价格预测区域 */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
            <TrendingUp className="w-6 h-6 text-purple-600" />
            <div>
              <h3 className="text-lg font-semibold text-purple-900">🔮 智能定价</h3>
              <p className="text-sm text-purple-700">AI智能分析商品价格趋势</p>
            </div>
          </div>
          
          <PricePrediction 
            itemData={{
              itemType: form.watch("itemType") || "",
              itemBrand: form.watch("itemBrand") || "",
              itemCondition: form.watch("itemCondition") || "",
              purchasePrice: form.watch("purchasePrice") || "0",
              itemSize: form.watch("itemSize") || "",
              itemColor: form.watch("itemColor") || "",
            }}
          />
        </div>

        <Separator className="my-8" />

        {/* 商品图片区域 */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200">
            <Camera className="w-6 h-6 text-orange-600" />
            <div>
              <h3 className="text-lg font-semibold text-orange-900">📸 商品图片</h3>
              <p className="text-sm text-orange-700">上传商品照片，最多支持10张</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={onPhotoChange}
                ref={fileInputRef}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                {uploading ? "上传中..." : "选择图片"}
              </Button>
              {photoUrls.length > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <span className="text-lg">📷</span>
                  {photoUrls.length} 张图片
                </Badge>
              )}
            </div>
            
            {photoUrls.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {photoUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`商品图片 ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 group-hover:border-blue-300 transition-colors"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        setPhotoUrls(photoUrls.filter((_, i) => i !== index));
                        form.setValue("photos", form.getValues("photos")?.filter((_, i) => i !== index) || []);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 操作按钮区域 */}
        <div className="flex justify-end gap-4 pt-6 border-t">
          {existingData && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  删除商品
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    确认删除
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作无法撤销。这将永久删除该商品及其所有相关数据。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                    删除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button type="submit" className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            {existingData ? (
              <>
                <Edit className="w-4 h-4" />
                更新商品
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                添加商品
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function TransactionModal({ existingData = null }: { existingData?: FormData | null }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          {existingData ? (
            <>
              <Edit className="w-4 h-4" />
              修改商品
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              添加商品
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {existingData ? "编辑商品信息" : "添加新商品"}
          </DialogTitle>
        </DialogHeader>
        <TransactionForm existingData={existingData} onSuccess={() => {
          // 刷新父组件的列表或状态
        }} />
      </DialogContent>
    </Dialog>
  );
}
