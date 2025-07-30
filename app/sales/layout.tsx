"use client"

import * as React from "react"
import { AppSidebar } from "../../components/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"

export default function SalesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <div className="flex h-screen bg-gray-50 w-full">
        <AppSidebar />
        <main className="flex-1 p-6 lg:p-8 overflow-auto min-w-0">
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
} 