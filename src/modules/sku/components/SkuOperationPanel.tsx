'use client'

import React from 'react'
import { Button } from '@/components/ui/button'

export default function SkuOperationPanel({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={onEdit}>编辑</Button>
      <Button size="sm" variant="destructive" onClick={onDelete}>删除</Button>
    </div>
  )
}


