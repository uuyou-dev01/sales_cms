import React from "react";
import { UserPermissionPanel } from "@/components/user-permission-panel";

export default function Page({ searchParams }: { searchParams: { userId?: string } }) {
  const userId = searchParams?.userId || "";
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">权限与操作审计</h1>
      {userId ? (
        <UserPermissionPanel userId={userId} />
      ) : (
        <div className="text-sm text-muted-foreground">请在 URL 查询参数提供 ?userId=xxxx 查看该用户的操作记录。</div>
      )}
    </div>
  );
}










