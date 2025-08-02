"use client";

import AddNewItems from "@/components/add-new-items";

export default function TestFormPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">表单测试页面</h1>
      <div className="max-w-md">
        <AddNewItems />
      </div>
    </div>
  );
} 