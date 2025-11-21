"use client";
import React from "react";
import useSWR from "swr";
import { Card } from "@/components/ui/card";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function UserPermissionPanel({ userId }: { userId: string }) {
  const { data } = useSWR(`/api/user/activity?userId=${userId}`, fetcher);
  return (
    <Card className="p-4 space-y-2">
      <h3 className="text-lg font-semibold">用户权限与活动</h3>
      <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-64">{JSON.stringify(data?.data || [], null, 2)}</pre>
    </Card>
  );
}










