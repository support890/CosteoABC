import {
  LayoutDashboard,
  Users,
  BookOpen,
  ArrowRightLeft,
  Target,
  BarChart3,
  Settings,
  Moon,
  Sun,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";

const mainNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Administración", url: "/admin", icon: Users },
];

const abcNav = [
  { title: "Diccionarios", url: "/dictionaries", icon: BookOpen },
  { title: "Asignaciones", url: "/assignments", icon: ArrowRightLeft },
];

const bscNav = [
  { title: "Estrategia", url: "/strategy", icon: Target },
  { title: "Analítica", url: "/analytics", icon: BarChart3 },
];

function NavSection({ label, items, collapsed }: { label: string; items: typeof mainNav; collapsed: boolean }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
                  className="hover:bg-accent/50"
                  activeClassName="bg-primary/10 text-primary font-medium"
                >
                  <item.icon className="mr-2 h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { theme, toggleTheme } = useTheme();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">A</span>
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-sm font-bold text-foreground">ABCCosting</h2>
              <p className="text-[10px] text-muted-foreground">Cloud Platform</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <NavSection label="General" items={mainNav} collapsed={collapsed} />
        <NavSection label="Costeo ABC" items={abcNav} collapsed={collapsed} />
        <NavSection label="BSC" items={bscNav} collapsed={collapsed} />
      </SidebarContent>

      <SidebarFooter className="p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="w-full flex items-center justify-center"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
