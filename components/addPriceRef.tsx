"use client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"

interface AddPriceRefProps {
    id: string;
    itemName: string;
    itemBrand: string;
    itemType: string;
    itemNumber: string;
    itemSize: string;
    itemMfgDate: Date;
    accessory: string;
    itemCondition: string;
    itemColor: string;
    refPrice: string;
    refPriceCurrency: string;
    refPriceExchangeRate: string;
    refPriceCNY: string;
    refDate: string;
    itemRemark: string;
}

export default function AddPriceRef() {
    const [open, setOpen] = useState(false);
    const [priceRef, setPriceRef] = useState<AddPriceRefProps>({
        id: "",
        itemName: "",
        itemBrand: "",
        itemType: "",
        itemNumber: "",
        itemSize: "",
        itemMfgDate: new Date(),
        accessory: "",
        itemCondition: "",
        itemColor: "",
        refPrice: "",
        refPriceCurrency: "",
        refPriceExchangeRate: "",
        refPriceCNY: "",
        refDate: "",
        itemRemark: "",
    });
    const handleDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setPriceRef({ ...priceRef, [e.target.name]: e.target.value });
    };

    const handleAddPriceRef = () => {
        console.log(priceRef);
    };
    const handleCurrencyChange = (value: string) => {
        setPriceRef({ ...priceRef, refPriceCurrency: value });
    };
    function calculateRefPriceCNY() {
        if (priceRef.refPriceCurrency === "1") {
            setPriceRef({ ...priceRef, refPriceCNY: priceRef.refPrice });
        } else if (priceRef.refPriceCurrency === "2") {
            setPriceRef({ ...priceRef, refPriceCNY: (Number(priceRef.refPrice) * Number(priceRef.refPriceExchangeRate)).toString() });
        } else if (priceRef.refPriceCurrency === "3") {
            setPriceRef({ ...priceRef, refPriceCNY: (Number(priceRef.refPrice) * Number(priceRef.refPriceExchangeRate)).toString() });
        }
    }

    useEffect(() => {
        calculateRefPriceCNY();
    }, [priceRef.refPriceCurrency, priceRef.refPriceExchangeRate]);


    return (
        <Dialog>
            <DialogTrigger>
                <Button>添加参考价格</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>添加参考价格</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="itemName" className="text-right">商品名称</Label>
                        <Input id="itemName" className="col-span-3" />
                    </div>
                </div>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="itemBrand" className="text-right">商品品牌</Label>
                        <Input id="itemBrand" className="col-span-3" />
                    </div>
                </div>
                <div>
                    <Select>
                        <SelectTrigger>
                            <SelectValue placeholder="请选择商品类型" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">衣服</SelectItem>
                            <SelectItem value="2">裤子</SelectItem>
                            <SelectItem value="3">鞋子</SelectItem>
                            <SelectItem value="4">包包</SelectItem>
                            <SelectItem value="5">配饰</SelectItem>
                            <SelectItem value="6">其他</SelectItem>
                            {priceRef.itemType === "6" && <Input id="itemTypeOther" className="col-span-3" />}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="itemNumber" className="text-right">商品编号</Label>
                        <Input id="itemNumber" className="col-span-3" />
                    </div>
                </div>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="itemSize" className="text-right">商品尺码</Label>
                        <Input id="itemSize" className="col-span-3" />
                    </div>
                </div>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="itemMfgDate" className="text-right">商品生产日期</Label>
                        <Input id="itemMfgDate" className="col-span-3" type="date" />
                    </div>
                </div>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="itemCondition" className="text-right">商品状态</Label>
                        <Input id="itemCondition" className="col-span-3" />
                    </div>
                </div>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="itemColor" className="text-right">商品颜色</Label>
                        <Input id="itemColor" className="col-span-3" />
                    </div>
                </div>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="refPrice" className="text-right">参考价格</Label>
                        <Input id="refPrice" className="col-span-3" />
                    </div>
                </div>
                <div className="grid gap-4 py-4">
                    <Select>
                        <SelectTrigger>选择货币</SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">人民币</SelectItem>
                            <SelectItem value="2">美元</SelectItem>
                            <SelectItem value="3">日元</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="refPriceExchangeRate" className="text-right">参考价格汇率</Label>
                        <Input id="refPriceExchangeRate" className="col-span-3" />
                    </div>
                </div>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="refPriceCNY" className="text-right">参考价格人民币</Label>
                        <Input id="refPriceCNY" className="col-span-3" value={priceRef.refPriceCNY} />
                    </div>
                </div>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="refDate" className="text-right">参考日期</Label>
                        <Input id="refDate" className="col-span-3" />
                    </div>
                </div>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="itemRemark" className="text-right">备注</Label>
                        <Textarea id="itemRemark" className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleAddPriceRef}>添加</Button>
                    <Button onClick={() => setOpen(false)}>取消</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
