"use client";
import React from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function Page() {
  const { data, mutate } = useSWR('/api/exchange', fetcher);
  const list = (data?.data || []) as any[];
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">汇率管理</h1>
      <button className="px-3 py-1 rounded bg-primary text-primary-foreground" onClick={() => mutate()}>刷新</button>
      <div className="text-xs bg-muted p-2 rounded">
        {list.length === 0 ? '暂无汇率记录' : JSON.stringify(list, null, 2)}
      </div>
    </div>
  );
}










