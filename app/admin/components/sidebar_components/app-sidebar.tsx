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



import { TeamSwitcher } from "@/app/admin/components/sidebar_components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/app/admin/components/sidebar_components/ui/sidebar"
import { Separator } from "./ui/separator"
import Navbar from "../navbar_components/Navbar"

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
      <SidebarHeader>
        <TeamSwitcher  />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
