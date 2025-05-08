"use client"



import * as React from "react"
import {
  BookOpen,
  Users,
  Home,
  BadgeCent,
  GraduationCap,
  DoorOpen,
  Contact,
  Megaphone,

} from "lucide-react"

import { NavMain } from "@/app/admin/components/sidebar_components/nav-main"


import { Shell } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuButton,
} from "@/app/admin/components/sidebar_components/ui/sidebar"

// This is sample data.
const data = {
  
  navMain: [
    {
      title: "Home",
      url: "/admin",
      icon: Home,
      isActive: true,
    },
    {
      title: "Students",
      url: "/admin/students",
      icon: Users,
    },
    {
      title: "Teachers",
      url: "/admin/teachers",
      icon: GraduationCap,
      
    },
    {
      title: "Subjects",
      url: "/admin/subjects",
      icon: BookOpen,
    },
    {
      title: "Classes",
      url: "/admin/class",
      icon: DoorOpen,
    },
    {
      title: "Parents",
      url: "/admin/class",
      icon: Contact,
    },
    {
      title: "Fees",
      url: "/admin/fees",
      icon: BadgeCent,
    },
    {
      title: "Announcements",
      url: "/admin/fees",
      icon: Megaphone,
    },
  
  ],
  
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader >
      <SidebarMenu > 
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
     
      </SidebarHeader>
      <SidebarContent >
        <NavMain items={data.navMain} />
        
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
