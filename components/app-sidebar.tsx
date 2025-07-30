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
      let updatedNavMain = [...data.navMain];

      // 处理月份数据
      if (monthsData.months && Array.isArray(monthsData.months)) {
        const monthItems = monthsData.months.map((month: string) => {
          const [year, monthNum] = month.split("-");
          const monthNames = [
            "一月", "二月", "三月", "四月", "五月", "六月",
            "七月", "八月", "九月", "十月", "十一月", "十二月"
          ];
          return {
            title: `${year}年${monthNames[parseInt(monthNum) - 1]}`,
            url: `/sales/${month}`,
          };
        });

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

        updatedNavMain = updatedNavMain.map(item => 
          item.title === "仓库管理" 
            ? { ...item, items: warehouseItems }
            : item
        );
      }

      setData(prev => ({
        ...prev,
        navMain: updatedNavMain,
      }));
    })
    .catch((error) => {
      console.error("获取侧边栏数据失败:", error);
    });
  }, []);

  return data;
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const data = useSidebarData();
  
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

