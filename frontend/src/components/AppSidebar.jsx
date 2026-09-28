import { Link, useLocation } from "react-router-dom";
import { GitCompareArrows, LibraryBig, Moon, Sun } from "lucide-react";
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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useTheme } from "@/hooks/use-theme";

const NAV_ITEMS = [
  { to: "/library", label: "Library", icon: LibraryBig },
  { to: "/compare", label: "Compare", icon: GitCompareArrows },
];

// Plain-text product name. Also used in AppLayout's top bar.
export function Wordmark() {
  return (
    <Link
      to="/library"
      className="rounded-md px-2 py-1 text-base font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      SongDNA
    </Link>
  );
}

// `triggerRef` lets AppLayout move focus to this toggle when the sidebar reopens.
function AppSidebar({ triggerRef }) {
  const { pathname } = useLocation();
  const { theme, toggle } = useTheme();
  const { isMobile, state } = useSidebar();
  const isDark = theme === "dark";
  // Collapsed on desktop, the sidebar slides off-screen but stays in the DOM.
  // Keep its toggle out of the Tab order then; the top bar's toggle replaces it.
  const triggerHidden = !isMobile && state === "collapsed";

  return (
    <Sidebar>
      <SidebarHeader className="h-12 flex-row items-center justify-between md:h-24">
        <Wordmark />
        <SidebarTrigger ref={triggerRef} tabIndex={triggerHidden ? -1 : undefined} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(to)}>
                    <Link to={to}>
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggle}>
              {isDark ? <Sun /> : <Moon />}
              <span>{isDark ? "Light mode" : "Dark mode"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default AppSidebar;
