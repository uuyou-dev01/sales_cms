"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  AudioWaveform,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  ShoppingCart,
  Package,
} from "lucide-react"

import { NavMain } from "./nav-main"
import { NavProjects } from "./nav-projects"
import { NavUser } from "./nav-user"
import { TeamSwitcher } from "./team-switcher"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar"

// 动态数据获取函数
function useSidebarData() {
  const pathname = usePathname();
  const [data, setData] = React.useState({
    user: {
      name: "shadcn",
      email: "m@example.com",
      avatar: "/avatars/shadcn.jpg",
    },
    teams: [
      {
        name: "Acme Inc",
        logo: GalleryVerticalEnd,
        plan: "Enterprise",
      },
      {
        name: "Acme Corp.",
        logo: AudioWaveform,
        plan: "Startup",
      },
      {
        name: "Evil Corp.",
        logo: Command,
        plan: "Free",
      },
    ],
    navMain: [
      {
        title: "商品库存",
        url: "/items",
        icon: Package,
        isActive: pathname.startsWith("/items"),
        items: [] as Array<{ title: string; url: string }>,
      },
      {
        title: "销售管理",
        url: "/sales",
        icon: ShoppingCart,
        isActive: pathname.startsWith("/sales"),
        items: [] as Array<{ title: string; url: string }>,
      },
      {
        title: "仓库管理",
        url: "/warehouse",
        icon: Map,
        isActive: pathname.startsWith("/warehouse"),
        items: [],
      },
    ],
    projects: [
      {
        name: "Design Engineering",
        url: "#",
        icon: Frame,
      },
      {
        name: "Sales & Marketing",
        url: "#",
        icon: PieChart,
      },
      {
        name: "Travel",
        url: "#",
        icon: Map,
      },
    ],
  });

  React.useEffect(() => {
    // 并行获取月份数据、仓库数据、商品统计数据和商品分类数据
    Promise.all([
      fetch("/api/items/months").then(res => res.json()),
      fetch("/api/warehouses").then(res => res.json()),
      fetch("/api/items/stats").then(res => res.json()),
      fetch("/api/items/categories").then(res => res.json())
    ])
    .then(([monthsData, warehousesData, itemsStats, categoriesData]) => {
      console.log("获取到的月份数据:", monthsData);
      console.log("获取到的仓库数据:", warehousesData);
      console.log("获取到的商品统计数据:", itemsStats);
      console.log("获取到的商品分类数据:", categoriesData);
      
      setData(prev => {
        let updatedNavMain = [...prev.navMain];

        // 处理商品库存数据
        if (itemsStats && !itemsStats.error) {
          const itemsSubItems = [
            {
              title: `全部商品 (${itemsStats.totalItems || 0})`,
              url: "/items",
            },
            {
              title: `在库商品 (${itemsStats.inStockCount || 0})`,
              url: "/items?status=in_stock",
            },
            {
              title: `已售商品 (${itemsStats.soldCount || 0})`,
              url: "/items?status=sold",
            },
          ];

          // 添加商品分类子菜单
          if (categoriesData && categoriesData.success && categoriesData.categories) {
            const categoryItems = categoriesData.categories
              .filter((cat: { total: number }) => cat.total > 0) // 只显示有商品的分类
              .slice(0, 5) // 最多显示5个分类
              .map((cat: { config: { icon: string }, type: string, total: number }) => ({
                title: `${cat.config.icon} ${cat.type} (${cat.total})`,
                url: `/items?category=${encodeURIComponent(cat.type)}`,
              }));
            
            itemsSubItems.push(...categoryItems);
          }

          updatedNavMain = updatedNavMain.map(item => 
            item.title === "商品库存" 
              ? { ...item, items: itemsSubItems }
              : item
          );
        }

        // 处理销售管理数据 - 先按类目分组，再按月份
        if (monthsData && Array.isArray(monthsData) && categoriesData && categoriesData.success && categoriesData.categories) {
          // 生成月份数据
          const monthItems = monthsData
            .map((month: string) => {
              try {
                const [year, monthNum] = month.split("-");
                const yearNum = parseInt(year);
                const monthNumInt = parseInt(monthNum);
                
                // 验证月份数据
                if (isNaN(yearNum) || isNaN(monthNumInt) || monthNumInt < 1 || monthNumInt > 12) {
                  console.warn("无效的月份格式:", month);
                  return null;
                }
                
                const monthNames = [
                  "一月", "二月", "三月", "四月", "五月", "六月",
                  "七月", "八月", "九月", "十月", "十一月", "十二月"
                ];
                
                return {
                  title: `${yearNum}年${monthNames[monthNumInt - 1]}`,
                  url: `/sales/${month}`,
                  month: month
                };
              } catch (error) {
                console.error("处理月份数据失败:", month, error);
                return null;
              }
            })
            .filter((item): item is { title: string; url: string; month: string } => item !== null);

          // 按类目创建销售管理子菜单
          const salesCategoryItems = [
            // 全部销售数据
            {
              title: "全部销售",
              url: "/sales",
              items: monthItems.map(monthItem => ({
                title: monthItem.title,
                url: monthItem.url
              }))
            },
            // 按商品类目分组的销售数据
            ...categoriesData.categories
              .filter((cat: { total: number }) => cat.total > 0) // 只显示有商品的分类
              .slice(0, 6) // 最多显示6个分类
              .map((cat: { config: { icon: string }, type: string, total: number }) => ({
                title: `${cat.config.icon} ${cat.type}`,
                url: `/sales?category=${encodeURIComponent(cat.type)}`,
                items: monthItems.map(monthItem => ({
                  title: monthItem.title,
                  url: `/sales/${monthItem.month}?category=${encodeURIComponent(cat.type)}`
                }))
              }))
          ];
          
          console.log("生成的销售类目子项目:", salesCategoryItems);

          updatedNavMain = updatedNavMain.map(item => 
            item.title === "销售管理" 
              ? { ...item, items: salesCategoryItems }
              : item
          );
        } else if (monthsData && Array.isArray(monthsData)) {
          // 如果没有分类数据，回退到原来的月份显示方式
          const monthItems = monthsData
            .map((month: string) => {
              try {
                const [year, monthNum] = month.split("-");
                const yearNum = parseInt(year);
                const monthNumInt = parseInt(monthNum);
                
                if (isNaN(yearNum) || isNaN(monthNumInt) || monthNumInt < 1 || monthNumInt > 12) {
                  console.warn("无效的月份格式:", month);
                  return null;
                }
                
                const monthNames = [
                  "一月", "二月", "三月", "四月", "五月", "六月",
                  "七月", "八月", "九月", "十月", "十一月", "十二月"
                ];
                
                return {
                  title: `${yearNum}年${monthNames[monthNumInt - 1]}`,
                  url: `/sales/${month}`,
                };
              } catch (error) {
                console.error("处理月份数据失败:", month, error);
                return null;
              }
            })
            .filter((item): item is { title: string; url: string } => item !== null);

          updatedNavMain = updatedNavMain.map(item => 
            item.title === "销售管理" 
              ? { ...item, items: monthItems }
              : item
          );
        }

        // 处理仓库数据
        if (warehousesData && Array.isArray(warehousesData)) {
          const warehouseItems = warehousesData.map((warehouse: { name: string; positions: Array<{ name: string; capacity: number; used: number }> }) => {
            const totalCapacity = warehouse.positions.reduce((sum: number, pos: { capacity: number; used: number }) => sum + pos.capacity, 0);
            const totalUsed = warehouse.positions.reduce((sum: number, pos: { capacity: number; used: number }) => sum + pos.used, 0);
            
            // 为每个仓库创建仓位子项目
            const positionItems = warehouse.positions.map((position: { name: string; capacity: number; used: number }) => ({
              title: `${position.name} (${position.used}/${position.capacity})`,
              url: `/warehouse`,
            }));
            
            return {
              title: `${warehouse.name} (${totalUsed}/${totalCapacity})`,
              url: `/warehouse`,
              items: positionItems,
            };
          });
          
          console.log("生成的仓库子项目:", warehouseItems);

          updatedNavMain = updatedNavMain.map(item => 
            item.title === "仓库管理" 
              ? { ...item, items: warehouseItems }
              : item
          );
        } else {
          console.warn("仓库数据无效或为空:", warehousesData);
          // 如果没有仓库数据，至少显示一个默认项
          updatedNavMain = updatedNavMain.map(item => 
            item.title === "仓库管理" 
              ? { ...item, items: [{ title: "暂无仓库数据", url: "/warehouse" }] }
              : item
          );
        }
        
        console.log("更新后的导航数据:", updatedNavMain);

        return {
          ...prev,
          navMain: updatedNavMain,
        };
      });
    })
    .catch((error) => {
      console.error("获取侧边栏数据失败:", error);
      // 出错时设置默认数据
      setData(prev => ({
        ...prev,
        navMain: prev.navMain.map(item => 
          item.title === "仓库管理" 
            ? { ...item, items: [{ title: "加载失败", url: "/warehouse" }] }
            : item
        )
      }));
    });
  }, []);

  return data;
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const data = useSidebarData();
  
  console.log("AppSidebar 渲染数据:", data);
  console.log("导航主项目:", data.navMain);
  
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

