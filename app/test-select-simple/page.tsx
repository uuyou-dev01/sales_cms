"use client";
import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-simple";

export default function TestSelectSimple() {
  const [value, setValue] = React.useState<string>("");

  const handleChange = (newValue: string) => {
    console.log("Select值改变:", newValue);
    setValue(newValue);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">简化Select测试</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">选择测试:</label>
          <Select value={value} onValueChange={handleChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="请选择..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option1">选项1</SelectItem>
              <SelectItem value="option2">选项2</SelectItem>
              <SelectItem value="option3">选项3</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="p-4 bg-gray-100 rounded">
          <p>当前选择的值: <strong>{value || "无"}</strong></p>
        </div>

        <button 
          onClick={() => setValue("")}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          重置选择
        </button>
      </div>
    </div>
  );
}
