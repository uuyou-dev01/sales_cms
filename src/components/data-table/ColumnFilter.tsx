'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Filter } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface ColumnFilterProps {
  label: string
  options: string[]
  selectedValues: string[]
  onChange: (values: string[]) => void
  emptyText?: string
}

export function ColumnFilter({ label, options, selectedValues, onChange, emptyText = '暂无数据' }: ColumnFilterProps) {
  const [open, setOpen] = React.useState(false)
  const uniqueOptions = React.useMemo(() => Array.from(new Set(options)).filter(Boolean), [options])

  const toggleValue = (value: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedValues, value])
    } else {
      onChange(selectedValues.filter((val) => val !== value))
    }
  }

  const handleReset = () => {
    onChange([])
  }

  const handleSelectAll = () => {
    onChange(uniqueOptions)
  }

  const activeCount = selectedValues.length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-2" aria-label={`${label}筛选`}>
          <Filter className="h-3.5 w-3.5" />
          {activeCount > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{activeCount}</Badge>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="border-b px-3 py-2 text-sm font-medium">{label} 筛选</div>
        <div className="max-h-48 overflow-auto px-3 py-2 space-y-1">
          {uniqueOptions.length === 0 && <p className="text-xs text-muted-foreground">{emptyText}</p>}
          {uniqueOptions.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm leading-none">
              <Checkbox checked={selectedValues.includes(option)} onCheckedChange={(checked) => toggleValue(option, Boolean(checked))} className="h-3.5 w-3.5" />
              <span>{option}</span>
            </label>
          ))}
        </div>
        <div className="flex items-center justify-between border-t px-3 py-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            重置
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSelectAll} disabled={uniqueOptions.length === 0}>
            全选
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}


