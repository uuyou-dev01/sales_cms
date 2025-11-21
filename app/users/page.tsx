'use client'

import React from 'react'
import dynamic from 'next/dynamic'

const UserPermissionPanel = dynamic(() => import('@/src/modules/user/components/UserPermissionPanel').then(m => m.default || m), { ssr: false })

export default function UsersPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">用户与权限</h1>
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
        <h2 className="text-lg font-medium mb-4">权限配置</h2>
        <UserPermissionPanel />
      </div>
    </div>
  )
}


