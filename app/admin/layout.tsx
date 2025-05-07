import { AppSidebar } from "@/app/admin/components/sidebar_components/app-sidebar"

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/app/admin/components/sidebar_components/ui/sidebar"
import Navbar from "./components/navbar_components/Navbar"


export default function Layout({
    children,
  }: {
    children: React.ReactNode
  }) {
    return (
      <SidebarProvider className="">
        <AppSidebar />
        <SidebarInset>
        {/* Header/Navbar Section */}
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
          </div>
          <Navbar />
        </header>
    
        {/* Main Content Below Navbar */}
        <main className="p-4">
          {children}
        </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }