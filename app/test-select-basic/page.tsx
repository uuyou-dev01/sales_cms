"use client";
import * as React from "react";

export default function TestSelectBasic() {
  const [value, setValue] = React.useState<string>("");

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = event.target.value;
    console.log("Select值改变:", newValue);
    setValue(newValue);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">基础Select测试（原生HTML）</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">选择测试:</label>
          <select 
            value={value} 
            onChange={handleChange}
            className="w-[200px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">请选择...</option>
            <option value="option1">选项1</option>
            <option value="option2">选项2</option>
            <option value="option3">选项3</option>
          </select>
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
