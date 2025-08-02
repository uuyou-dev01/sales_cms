"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, Upload, X, Save, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { WarehouseSelector } from "@/components/warehouse-selector";
import { PricePredictionPanel } from "@/components/price-prediction-panel";
import { OtherFeesManager } from "@/components/other-fees-manager";
import { STATUS_OPTIONS, LISTING_PLATFORM_OPTIONS } from "@/lib/constants";

// 表单数据接口
interface FormData {
  // 基本信息
  itemId: string;
  itemType: string;
  itemName: string;
  itemBrand: string;
  itemNumber: string;
  domesticShipping: string;
  internationalShipping: string;
  itemSize: string;
  itemCondition: string;
  purchasePrice: string;
  purchaseDate: Date;
  itemStatus: string;
  purchasePlatform: string;
  domesticTrackingNumber: string;
  itemMfgDate: string;
  itemColor: string;
  
  // 交易信息
  launchDate: Date | null;
  storageDuration: string;
  warehousePositionId: string;
  listingPlatforms: string[];
  isReturn: boolean;
  returnFee: string;
  
  // 售出信息
  soldDate: Date | null;
  soldPrice: string;
  soldPlatform: string;
  soldPriceCurrency: string;
  soldPriceExchangeRate: string;
  
  // 图片和其他
  photos: string[];
  otherFees: Array<{
    id: string;
    type: string;
    amount: string;
    description: string;
  }>;
  
  // 其他字段（保持兼容性）
  itemRemarks: string;
  shipping: string;
  transactionStatues: string;
  purchaseAmount: string;
  purchasePriceCurrency: string;
  purchasePriceExchangeRate: string;
  itemGrossProfit: string;
  itemNetProfit: string;
  position: string;
}

// 表单验证模式
const formSchema = z.object({
  // 基本信息
  itemId: z.string().min(1, "请输入商品ID"),
  itemType: z.string().min(1, "请选择商品类型").default("鞋子"),
  itemName: z.string().min(1, "请输入商品名称"),
  itemBrand: z.string().min(1, "请输入品牌").default("Nike"),
  itemNumber: z.string().min(1, "请输入货号"),
  domesticShipping: z.string().default("10"),
  internationalShipping: z.string().default("100"),
  itemSize: z.string().min(1, "请输入尺码"),
  itemCondition: z.string().min(1, "请选择成色"),
  purchasePrice: z.string().min(1, "请输入购入价格"),
  purchaseDate: z.date().min(new Date("2025-01-01"), "请输入购入日期"),
  itemStatus: z.string().min(1, "请选择商品状态"),
  purchasePlatform: z.string().min(1, "请选择购入平台"),
  domesticTrackingNumber: z.string().optional(),
  itemMfgDate: z.string().optional(),
  itemColor: z.string().optional(),
  
  // 交易信息
  launchDate: z.date().nullable().optional(),
  storageDuration: z.string().default("0"),
  warehousePositionId: z.string().optional(),
  listingPlatforms: z.array(z.string()).default([]),
  isReturn: z.boolean().default(false),
  returnFee: z.string().default("0"),
  
  // 售出信息
  soldDate: z.date().nullable().optional(),
  soldPrice: z.string().default("0"),
  soldPlatform: z.string().default("Mercari"),
  soldPriceCurrency: z.string().default("CNY"),
  soldPriceExchangeRate: z.string().default("0.5"),
  
  // 图片和其他
  photos: z.array(z.string()).default([]),
  otherFees: z.array(z.object({
    id: z.string(),
    type: z.string(),
    amount: z.string(),
    description: z.string(),
  })).default([]),
  
  // 其他字段
  itemRemarks: z.string().optional(),
  shipping: z.string().default(""),
  transactionStatues: z.string().default("未上架"),
  purchaseAmount: z.string().default("0"),
  purchasePriceCurrency: z.string().default("CNY"),
  purchasePriceExchangeRate: z.string().default("1"),
  itemGrossProfit: z.string().default("0"),
  itemNetProfit: z.string().default("0"),
  position: z.string().optional(),
});

// 商品类型选项
const ITEM_TYPES = [
  { value: "服装", label: "服装" },
  { value: "鞋子", label: "鞋子" },
  { value: "包包", label: "包包" },
  { value: "配饰", label: "配饰" },
  { value: "电子产品", label: "电子产品" },
  { value: "其他", label: "其他" },
];

// 成色选项
const CONDITION_OPTIONS = [
  { value: "全新", label: "全新" },
  { value: "9成新", label: "9成新" },
  { value: "8成新", label: "8成新" },
  { value: "7成新", label: "7成新" },
  { value: "6成新", label: "6成新" },
  { value: "5成新及以下", label: "5成新及以下" },
];

// 购入平台选项
const PURCHASE_PLATFORMS = [
  { value: "闲鱼", label: "闲鱼" },
  { value: "转转", label: "转转" },
  { value: "淘宝", label: "淘宝" },
  { value: "拼多多", label: "拼多多" },
  { value: "京东", label: "京东" },
  { value: "其他", label: "其他" },
];

interface TransactionFormProps {
  existingData?: FormData | null;
  onSuccess: () => void;
}

export function TransactionForm({ existingData, onSuccess }: TransactionFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [pricePrediction, setPricePrediction] = React.useState<any>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: existingData || {
      itemId: `ITEM_${Date.now()}`,
      itemType: "",
      itemName: "",
      itemBrand: "",
      itemNumber: "",
      domesticShipping: "0",
      internationalShipping: "0",
      itemSize: "",
      itemCondition: "",
      purchasePrice: "",
      purchaseDate: new Date(),
      itemStatus: "未上架",
      purchasePlatform: "",
      domesticTrackingNumber: "",
      itemMfgDate: "",
      itemColor: "",
      launchDate: null,
      storageDuration: "0",
      warehousePositionId: "",
      listingPlatforms: [],
      isReturn: false,
      returnFee: "0",
      soldDate: null,
      soldPrice: "0",
      soldPlatform: "",
      soldPriceCurrency: "CNY",
      soldPriceExchangeRate: "1",
      photos: [],
      otherFees: [],
      itemRemarks: "",
      shipping: "",
      transactionStatues: "未上架",
      purchaseAmount: "0",
      purchasePriceCurrency: "CNY",
      purchasePriceExchangeRate: "1",
      itemGrossProfit: "0",
      itemNetProfit: "0",
      position: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const url = existingData ? "/api/items/update" : "/api/items/create";
      const method = existingData ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast({
          title: existingData ? "更新成功" : "添加成功",
          description: existingData ? "商品信息已更新" : "新商品已添加到数据库",
        });
        onSuccess();
      } else {
        const error = await response.json();
        throw new Error(error.error || "操作失败");
      }
    } catch (error) {
      toast({
        title: "操作失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (files: FileList) => {
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        const currentPhotos = form.getValues("photos");
        form.setValue("photos", [...currentPhotos, ...result.urls]);
      }
    } catch (error) {
      toast({
        title: "上传失败",
        description: "图片上传失败，请重试",
        variant: "destructive",
      });
    }
  };

  const removeImage = (index: number) => {
    const currentPhotos = form.getValues("photos");
    form.setValue("photos", currentPhotos.filter((_, i) => i !== index));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* 第一块：基本信息 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">基本信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="itemId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>商品ID</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="自动生成" />
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
                  <FormLabel>商品类型</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择商品类型" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ITEM_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="itemName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>商品名称</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="输入商品名称" />
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
                  <FormLabel>品牌</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="输入品牌" />
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
                  <FormLabel>货号</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="输入货号" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="domesticShipping"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>国内运费 (¥)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="0.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="internationalShipping"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>国际运费 (¥)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="0.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="itemSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>尺码</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="输入尺码" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="itemCondition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>成色</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择成色" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CONDITION_OPTIONS.map((condition) => (
                        <SelectItem key={condition.value} value={condition.value}>
                          {condition.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purchasePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>购入价格 (¥)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="0.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purchaseDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>购入时间</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal h-10",
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
              name="itemStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>商品状态</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择状态" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purchasePlatform"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>购入平台</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择平台" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PURCHASE_PLATFORMS.map((platform) => (
                        <SelectItem key={platform.value} value={platform.value}>
                          {platform.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="domesticTrackingNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>国内发货单号</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="输入发货单号" />
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
                  <FormLabel>生产日期</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="如：2023年春季" />
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
                  <FormLabel>颜色</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="输入颜色" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* 价格预测模块 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">价格预测</h3>
          <PricePredictionPanel
            purchasePrice={form.watch("purchasePrice")}
            domesticShipping={form.watch("domesticShipping")}
            internationalShipping={form.watch("internationalShipping")}
            itemNumber={form.watch("itemNumber")}
            onPredictionChange={setPricePrediction}
          />
        </div>

        {/* 第二块：交易信息 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">交易信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="launchDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>上架时间</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal h-10",
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
              name="storageDuration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>在库时长 (天)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="0" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="warehousePositionId"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>入库位置</FormLabel>
                  <WarehouseSelector
                    selectedWarehouseId=""
                    selectedPositionId={field.value || ""}
                    onWarehouseChange={() => {}}
                    onPositionChange={(positionId) => {
                      field.onChange(positionId);
                    }}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isReturn"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>是否产生退货</FormLabel>
                    <FormDescription>
                      如果商品有退货情况，请勾选此项
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {form.watch("isReturn") && (
              <FormField
                control={form.control}
                name="returnFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>退货费用 (¥)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" placeholder="0.00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* 售出信息 */}
            <FormField
              control={form.control}
              name="soldDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>售出时间</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal h-10",
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
              name="soldPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>售出价格 (¥)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="0.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="soldPlatform"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>售出平台</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择平台" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LISTING_PLATFORM_OPTIONS.map((platform) => (
                        <SelectItem key={platform.value} value={platform.value}>
                          {platform.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* 其他费用管理 */}
          <OtherFeesManager
            fees={form.watch("otherFees")}
            onFeesChange={(fees) => form.setValue("otherFees", fees)}
          />
        </div>

        {/* 第三块：图片上传 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">图片上传</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="image-upload" className="block mb-2">
                上传商品图片
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  id="image-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                  className="max-w-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("image-upload")?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  选择图片
                </Button>
              </div>
            </div>

            {/* 图片预览 */}
            {form.watch("photos").length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {form.watch("photos").map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo}
                      alt={`商品图片 ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 第四块：收益计算 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">收益计算</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-600">总成本</div>
                <div className="font-semibold text-lg">
                  ¥{(() => {
                    const purchasePrice = parseFloat(form.watch("purchasePrice") || "0");
                    const domesticShipping = parseFloat(form.watch("domesticShipping") || "0");
                    const internationalShipping = parseFloat(form.watch("internationalShipping") || "0");
                    const otherFeesTotal = form.watch("otherFees").reduce((sum, fee) => sum + parseFloat(fee.amount || "0"), 0);
                    return (purchasePrice + domesticShipping + internationalShipping + otherFeesTotal).toFixed(2);
                  })()}
                </div>
              </div>
              <div>
                <div className="text-gray-600">建议售价</div>
                <div className="font-semibold text-lg text-blue-600">
                  ¥{pricePrediction?.pricing?.suggestedPrice?.toFixed(2) || "0.00"}
                </div>
              </div>
              <div>
                <div className="text-gray-600">预计利润</div>
                <div className="font-semibold text-lg text-green-600">
                  ¥{pricePrediction?.pricing?.profitAmount?.toFixed(2) || "0.00"}
                </div>
              </div>
              <div>
                <div className="text-gray-600">利润率</div>
                <div className="font-semibold text-lg text-green-600">
                  {pricePrediction?.pricing?.profitMargin?.toFixed(1) || "0"}%
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                保存中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {existingData ? "更新商品" : "添加商品"}
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

export default function TransactionModal({ existingData = null }: { existingData?: FormData | null }) {
  const [open, setOpen] = React.useState(false);

  const handleSuccess = () => {
    setOpen(false);
    window.location.reload();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          {existingData ? "编辑商品" : "添加新商品"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingData ? "编辑商品" : "添加新商品"}</DialogTitle>
          <DialogDescription>
            {existingData ? "修改商品信息" : "填写商品信息并添加到数据库"}
          </DialogDescription>
        </DialogHeader>
        <TransactionForm existingData={existingData} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
