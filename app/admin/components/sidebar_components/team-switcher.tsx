"use client"

import * as React from "react"
import { Shell } from "lucide-react"
import {
  SidebarMenu,
  SidebarMenuButton,
 
} from "@/app/admin/components/sidebar_components/ui/sidebar"

export function TeamSwitcher(){

  return (
    <SidebarMenu> 
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Shell  className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">PETRA</span>
                <span className="truncate text-xs">School Management System</span>
              </div>
             
            </SidebarMenuButton>

    </SidebarMenu>
     
  )
}
