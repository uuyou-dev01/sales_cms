"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, DollarSign } from "lucide-react";
import { OTHER_FEE_OPTIONS, CURRENCY_OPTIONS } from "@/lib/constants";

interface OtherFee {
  id: string;
  type: string;
  amount: string;
  currency: string;
  description: string;
}

interface OtherFeesManagerProps {
  fees: OtherFee[];
  onFeesChange: (fees: OtherFee[]) => void;
}

export function OtherFeesManager({ fees, onFeesChange }: OtherFeesManagerProps) {
  const addFee = () => {
    const newFee: OtherFee = {
      id: Date.now().toString(),
      type: OTHER_FEE_OPTIONS[0].value,
      amount: "",
      currency: "JPY",
      description: "",
    };
    onFeesChange([...fees, newFee]);
  };

  const removeFee = (id: string) => {
    onFeesChange(fees.filter(fee => fee.id !== id));
  };

  const updateFee = (id: string, field: keyof OtherFee, value: string) => {
    onFeesChange(fees.map(fee => 
      fee.id === id ? { ...fee, [field]: value } : fee
    ));
  };

  const totalAmount = fees.reduce((sum, fee) => {
    return sum + (parseFloat(fee.amount) || 0);
  }, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            其他费用
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addFee}
            className="h-7 px-2"
          >
            <Plus className="w-3 h-3 mr-1" />
            添加费用
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {fees.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            暂无其他费用
          </div>
        ) : (
          <>
            {fees.map((fee) => (
              <div key={fee.id} className="border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {OTHER_FEE_OPTIONS.find(option => option.value === fee.type)?.icon}
                    <span className="text-sm font-medium">
                      {OTHER_FEE_OPTIONS.find(option => option.value === fee.type)?.label}
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFee(fee.id)}
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">费用类型</label>
                    <Select value={fee.type} onValueChange={(value) => updateFee(fee.id, 'type', value)}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OTHER_FEE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <span>{option.icon}</span>
                              <span>{option.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">货币</label>
                    <Select value={fee.currency} onValueChange={(value) => updateFee(fee.id, 'currency', value)}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">金额</label>
                    <Input
                      type="number"
                      value={fee.amount}
                      onChange={(e) => updateFee(fee.id, 'amount', e.target.value)}
                      placeholder="0.00"
                      className="h-8"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">备注</label>
                  <Textarea
                    value={fee.description}
                    onChange={(e) => updateFee(fee.id, 'description', e.target.value)}
                    placeholder="费用说明..."
                    className="h-16 resize-none"
                  />
                </div>
              </div>
            ))}
            
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">总费用:</span>
                <span className="text-lg font-bold text-red-600">¥{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
} 