"use client"

import * as React from "react"
import { ChevronRight, type LucideIcon } from "lucide-react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"

type NavLeaf = {
  key: string
  title: string
  url: string
  badge?: string
}

type NavChild = NavLeaf & {
  items?: NavLeaf[]
}

type NavItem = {
  key: string
  title: string
  url: string
  icon?: LucideIcon
  badge?: string
  isActive?: boolean
  items?: NavChild[]
}

export function NavMain({ items }: { items: NavItem[] }) {
  const [openItem, setOpenItem] = React.useState<string | null>(() => {
    const activeItem = items.find((item) => item.isActive)
    return activeItem ? activeItem.key : null
  })

  React.useEffect(() => {
    const activeItem = items.find((item) => item.isActive)
    if (activeItem) {
      setOpenItem(activeItem.key)
    }
  }, [items])

  const handleToggle = (key: string) => {
    setOpenItem((current) => (current === key ? null : key))
  }

  const renderIcon = (Icon?: LucideIcon) =>
    Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : <span className="h-4 w-4" />

  const renderBadge = (badge?: string, className = "") =>
    badge ? (
      <Badge variant="secondary" className={`ml-auto text-xs font-medium ${className}`}>
        {badge}
      </Badge>
    ) : null

  return (
    <SidebarGroup>
      <SidebarGroupLabel>工作区</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const hasChildren = !!(item.items && item.items.length > 0)
          if (!hasChildren) {
            return (
              <SidebarMenuItem key={item.key}>
                <SidebarMenuButton asChild tooltip={item.title}>
                  <a href={item.url}>
                    {renderIcon(item.icon)}
                    <span>{item.title}</span>
                    {renderBadge(item.badge)}
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }

          return (
            <Collapsible
              key={item.key}
              asChild
              open={openItem === item.key}
              onOpenChange={() => handleToggle(item.key)}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title}>
                    {renderIcon(item.icon)}
                    <span>{item.title}</span>
                    {renderBadge(item.badge, "ml-2")}
                    <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items!.map((subItem) => (
                      <React.Fragment key={subItem.key}>
                        {subItem.items && subItem.items.length > 0 ? (
                          <Collapsible asChild className="group/nested-collapsible">
                            <SidebarMenuSubItem>
                              <CollapsibleTrigger asChild>
                                <SidebarMenuSubButton>
                                  <span>{subItem.title}</span>
                                  {renderBadge(subItem.badge, "ml-2")}
                                  <ChevronRight className="ml-auto h-3 w-3 transition-transform group-data-[state=open]/nested-collapsible:rotate-90" />
                                </SidebarMenuSubButton>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <SidebarMenuSub>
                                  {subItem.items.map((nestedItem) => (
                                    <SidebarMenuSubItem key={nestedItem.key}>
                                      <SidebarMenuSubButton asChild>
                                        <a href={nestedItem.url}>
                                          <span className="ml-4">{nestedItem.title}</span>
                                          {renderBadge(nestedItem.badge)}
                                        </a>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  ))}
                                </SidebarMenuSub>
                              </CollapsibleContent>
                            </SidebarMenuSubItem>
                          </Collapsible>
                        ) : (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild>
                              <a href={subItem.url}>
                                <span>{subItem.title}</span>
                                {renderBadge(subItem.badge)}
                              </a>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                      </React.Fragment>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

