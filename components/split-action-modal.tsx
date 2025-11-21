"use client";
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function SplitActionModal({ parentItemId }: { parentItemId: string }) {
  const [subItems, setSubItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const splitBox = async () => {
    setLoading(true);
    await fetch('/api/split', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentItemId, allocations: subItems.map(id => ({ childItemId: id, method: 'AVERAGE' })) }),
    });
    setLoading(false);
  };
  return (
    <Card className="p-4 space-y-3">
      <h2 className="text-lg font-semibold">盲盒拆分记录</h2>
      <Button onClick={splitBox} disabled={loading}>{loading ? '处理中…' : '拆分端盒'}</Button>
      <div className="text-xs text-muted-foreground">子件ID: {subItems.join(', ') || '无'}</div>
    </Card>
  );
}










