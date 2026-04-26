"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  RiHomeLine,
  RiFolderLine,
  RiImageLine,
  RiAddCircleLine,
  RiLayoutGridLine,
  RiSparklingLine,
  RiArrowRightSLine,
} from "@remixicon/react"

import { UserButton } from "@daveyplate/better-auth-ui"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar"

interface NavSubItem {
  title: string
  url: string
}

interface NavItem {
  title: string
  url: string
  icon?: React.ElementType
  exact?: boolean
  items?: NavSubItem[]
}

interface NavGroup {
  title: string
  items: NavItem[]
}

//Navigation
const navGroups: NavGroup[] = [
  {
    title: "General",
    items: [
      {
        title: "Home",
        url: "/dashboard",
        icon: RiHomeLine,
        exact: true,
      },
      {
        title: "Gallery",
        url: "/dashboard/gallery",
        icon: RiLayoutGridLine
      },
    ]
  },
  {
    title: "Workspace",
    items: [
      {
        title: "Projects",
        url: "/dashboard/projects",
        icon: RiFolderLine
      },
      {
        title: "Assets",
        url: "/dashboard/assets",
        icon: RiImageLine
      },
      {
        title: "Create",
        url: "#",
        icon: RiAddCircleLine,
        items: [
          {
            title: "New Project",
            url: "/dashboard/projects/new",
          },
          {
            title: "New Asset",
            url: "/dashboard/assets/new",
          },
        ],
      },
    ]
  }
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false)
  }
  
  const isActive = (url: string, exact = false) => {
    if (url === "#") return false
    if (exact) return pathname === url
    return pathname === url || pathname.startsWith(url + "/")
  }

  // Check if any sub-item of "Create" is active, 
  // but EXCLUDE pages that should highlight their own main category (like Assets/Projects)
  const createItem = navGroups
    .flatMap(g => g.items)
    .find(n => n.title === "Create")

  const isCreateActive = createItem
    ?.items?.some((sub: NavSubItem) => {
      // If we are on these pages, we want the main category (Assets or Projects) to highlight, not the "Create" group
      if (pathname === "/dashboard/assets/new" || pathname === "/dashboard/projects/new") {
        return false
      }
      return pathname === sub.url
    }) ?? false

  return (
    <Sidebar {...props}>
      {/* HEADER: AirOne Studio Branding */}
      <SidebarHeader className="h-14 justify-center px-3 pb-5 pt-10">
        <div className="flex items-center gap-2 rounded-xl  px-3 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <RiSparklingLine className="size-4" />
          </div>
          <span className="font-semibold tracking-tight text-base">
            AirOne Studio
          </span>
        </div>
      </SidebarHeader>

      {/* CONTENT: Navigation Links */}
      <SidebarContent>
        {navGroups.map((group, _index) => (
          <React.Fragment key={group.title}>
            <SidebarGroup>
              <SidebarGroupLabel className="uppercase text-muted-foreground">{group.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    // If the item has sub-items (like "Create"), make it Collapsible
                    if (item.items) {
                      return (
                        <Collapsible
                          key={item.title}
                          asChild
                          defaultOpen={isCreateActive}
                          className="group/collapsible"
                        >
                          <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton 
                                size="sm" 
                                className="text-sm font-medium" 
                                tooltip={item.title}
                                isActive={isCreateActive}
                              >
                                {item.icon && <item.icon className="size-4" />}
                                <span>{item.title}</span>
                                <RiArrowRightSLine className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub>
                                {item.items.map((subItem: NavSubItem) => (
                                  <SidebarMenuSubItem key={subItem.title}>
                                    <SidebarMenuSubButton
                                      asChild
                                      isActive={pathname === subItem.url}
                                    >
                                      <Link href={subItem.url} onClick={handleNavClick}>
                                        <span>{subItem.title}</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                ))}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </SidebarMenuItem>
                        </Collapsible>
                      )
                    }

                    // If it's a standard link (like Home, Projects, Assets)
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          size="sm"
                          className="text-sm font-medium"
                          asChild
                          tooltip={item.title}
                          isActive={isActive(item.url, item.exact)}
                        >
                          <Link href={item.url} onClick={handleNavClick}>
                            {item.icon && <item.icon className="size-4" />}
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )

                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </React.Fragment>
        ))}
      </SidebarContent>

      {/* FOOTER: Better Auth User Profile */}
      <SidebarFooter className="p-4">
        <UserButton />
      </SidebarFooter>
    </Sidebar>
  )
}
