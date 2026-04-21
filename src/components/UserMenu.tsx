import { LogOut, Sun, Moon, User, UserPen, Zap } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UsageDialog } from "@/components/UsageDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/hooks/use-tenant";
import { useSuperAdmin } from "@/hooks/use-superadmin";
import { useTheme } from "@/hooks/use-theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const { tenant, userRole } = useTenant();
  const { isSuperAdmin } = useSuperAdmin();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [usageOpen, setUsageOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Usuario";

  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? "")
    .join("");

  const roleLabel = isSuperAdmin
    ? "Superadmin"
    : userRole === "admin"
    ? "Admin"
    : "Usuario invitado";

  const planLabel = tenant?.plan
    ? tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)
    : null;

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-1.5 text-sm font-medium hover:bg-accent/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold select-none">
            {initials || <User className="h-3.5 w-3.5" />}
          </span>
          <span className="hidden sm:block max-w-[120px] truncate">
            {displayName}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="pb-2">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
              {initials || <User className="h-4 w-4" />}
            </span>
            <div className="flex flex-col gap-0.5 overflow-hidden">
              <span className="font-semibold text-sm leading-tight truncate">
                {displayName}
              </span>
              <span className="text-xs text-muted-foreground leading-tight truncate">
                {roleLabel}
              </span>
            </div>
            {planLabel && (
              <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 shrink-0">
                {planLabel}
              </Badge>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => navigate("/profile")} className="gap-2 cursor-pointer">
          <UserPen className="h-4 w-4" />
          Editar perfil
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => setUsageOpen(true)} className="gap-2 cursor-pointer">
          <Zap className="h-4 w-4" />
          Consumo
        </DropdownMenuItem>

        <DropdownMenuItem onClick={toggleTheme} className="gap-2 cursor-pointer">
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
          {theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="gap-2 cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <UsageDialog open={usageOpen} onOpenChange={setUsageOpen} />
    </>
  );
}
