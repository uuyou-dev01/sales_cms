"use client"

import * as React from "react"
import {
  AudioWaveform,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  ShoppingCart,
} from "lucide-react"

import { NavMain } from "./nav-main"
import { NavProjects } from "./nav-projects"
import { NavUser } from "./nav-user"
import { TeamSwitcher } from "./team-switcher"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar"

// 动态数据获取函数
function useSidebarData() {
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
        title: "销售管理",
        url: "/sales",
        icon: ShoppingCart,
        isActive: true,
        items: [] as Array<{ title: string; url: string }>,
      },
      {
        title: "仓库管理",
        url: "/warehouse",
        icon: Map,
        isActive: false,
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
    // 并行获取月份数据和仓库数据
    Promise.all([
      fetch("/api/items/months").then(res => res.json()),
      fetch("/api/warehouses").then(res => res.json())
    ])
    .then(([monthsData, warehousesData]) => {
      console.log("获取到的月份数据:", monthsData);
      console.log("获取到的仓库数据:", warehousesData);
      
      setData(prev => {
        let updatedNavMain = [...prev.navMain];

        // 处理月份数据
        if (monthsData && Array.isArray(monthsData)) {
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
                };
              } catch (error) {
                console.error("处理月份数据失败:", month, error);
                return null;
              }
            })
            .filter((item): item is { title: string; url: string } => item !== null); // 类型安全的过滤
          
          console.log("生成的月份子项目:", monthItems);

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

