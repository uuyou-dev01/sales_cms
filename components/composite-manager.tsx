"use client";

import React from "react";
import useSWR from "swr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }
  return res.json();
};

export function CompositeManager({ parentSkuId }: { parentSkuId?: string }) {
  const { data, mutate } = useSWR(parentSkuId ? `/api/composite-sku?parentSkuId=${parentSkuId}` : undefined, fetcher);
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">组合 SKU 管理</h3>
        <Button onClick={() => mutate()}>刷新</Button>
      </div>
      <pre className="text-xs bg-muted p-2 rounded">{JSON.stringify(data?.data || [], null, 2)}</pre>
    </Card>
  );
}


