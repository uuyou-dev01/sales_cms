"use client"

import * as React from "react"
import { type LucideIcon } from "lucide-react"
import { EmojiIcons } from "@/components/emoji-icons";

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

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
      items?: {
        title: string
        url: string
      }[]
    }[]
  }[]
}) {
  // 状态管理：控制哪个菜单项是展开的
  const [openItem, setOpenItem] = React.useState<string | null>(() => {
    // 初始化时，找到活跃的菜单项并展开它
    const activeItem = items.find(item => item.isActive);
    return activeItem ? activeItem.title : null;
  });

  // 当items变化时，更新openItem
  React.useEffect(() => {
    const activeItem = items.find(item => item.isActive);
    if (activeItem) {
      setOpenItem(activeItem.title);
    }
  }, [items]);

  // 图标映射函数
  const getIcon = (title: string) => {
    switch (title) {
      case "销售管理":
        return EmojiIcons.ShoppingCart;
      case "仓库管理":
        return EmojiIcons.Warehouse;
      default:
        return EmojiIcons.Package;
    }
  };

  // 处理菜单项点击
  const handleToggle = (title: string) => {
    setOpenItem(openItem === title ? null : title);
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible 
            key={item.title} 
            asChild 
            open={openItem === item.title}
            onOpenChange={() => handleToggle(item.title)}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={item.title}>
                  <span className="text-lg">{getIcon(item.title)}</span>
                  <span>{item.title}</span>
                  <span className="text-lg">{EmojiIcons.ChevronRight}</span>
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items && item.items.length > 0 ? (
                    item.items.map((subItem) => (
                      <React.Fragment key={subItem.title}>
                        {/* 如果子项有自己的子项，则创建嵌套结构 */}
                        {subItem.items && subItem.items.length > 0 ? (
                          <Collapsible key={subItem.title} asChild className="group/nested-collapsible">
                            <SidebarMenuSubItem>
                              <CollapsibleTrigger asChild>
                                <SidebarMenuSubButton>
                                  <span>{subItem.title}</span>
                                  <span className="text-sm ml-auto">{EmojiIcons.ChevronRight}</span>
                                </SidebarMenuSubButton>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <SidebarMenuSub>
                                  {subItem.items.map((nestedItem) => (
                                    <SidebarMenuSubItem key={nestedItem.title}>
                                      <SidebarMenuSubButton asChild>
                                        <a href={nestedItem.url}>
                                          <span className="ml-4">{nestedItem.title}</span>
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
                              </a>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                      </React.Fragment>
                    ))
                  ) : (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton disabled>
                        <span>暂无数据</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

