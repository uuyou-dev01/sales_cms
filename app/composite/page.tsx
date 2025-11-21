"use client";
import React from "react";
import { CompositeManager } from "@/components/composite-manager";

export default function Page() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">组合 SKU 管理</h1>
      <CompositeManager />
    </div>
  );
}










