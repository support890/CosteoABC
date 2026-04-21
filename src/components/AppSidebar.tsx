import {
  LayoutDashboard,
  Users,
  BookOpen,
  ArrowRightLeft,
  Target,
  BarChart3,
  PieChart,
  GitBranch,
  ShieldCheck,
  Building2,
  Zap,
  CalendarRange,
  Box,
  FlaskConical,
  FileSpreadsheet,
  Database,
  ArrowLeft,
  TrendingUp,
  Upload,
  Truck,
  LineChart,
  Settings2,
  AlertTriangle,
  Layers,
  TableProperties,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useModelContext } from "@/contexts/ModelContext";
import { useBIExpressContext } from "@/contexts/BIExpressContext";
import { TEMPLATE_CATALOG } from "@/lib/bi-express-engine";
import { useLogisticsContext } from "@/contexts/LogisticsContext";
import { useForecastContext } from "@/contexts/ForecastContext";
import { useBSCContext } from "@/contexts/BSCContext";
import { useTenant } from "@/hooks/use-tenant";
import { useSuperAdmin } from "@/hooks/use-superadmin";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { getCurrencySymbol } from "@/hooks/use-currency";

const mainNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
];

const adminNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Administración", url: "/admin", icon: Users },
];


function NavSection({
  label,
  items,
  collapsed,
}: {
  label: string;
  items: typeof mainNav;
  collapsed: boolean;
}) {
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
                  end={item.url === "/dashboard"}
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
  const { userRole } = useTenant();
  const { isSuperAdmin } = useSuperAdmin();
  const { selectedModel, selectedPeriod, setSelectedModel, setSelectedPeriod } =
    useModelContext();
  const { selectedBIModel, selectedBIPeriod, setSelectedBIModel, setSelectedBIPeriod, loadedTemplates } =
    useBIExpressContext();
  const { selectedLogisticsModel, selectedLogisticsPeriod, setSelectedLogisticsModel, setSelectedLogisticsPeriod } =
    useLogisticsContext();
  const { selectedForecastModel, selectedForecastPeriod, setSelectedForecastModel, setSelectedForecastPeriod } =
    useForecastContext();
  const { selectedBSCModel, selectedBSCPeriod, setSelectedBSCModel, setSelectedBSCPeriod } =
    useBSCContext();
  const navigate = useNavigate();

  const isInABC = !!(selectedModel && selectedPeriod);
  const isInBI = !!(selectedBIModel && selectedBIPeriod);
  const isInLogistics = !!(selectedLogisticsModel && selectedLogisticsPeriod);
  const isInForecast = !!(selectedForecastModel && selectedForecastPeriod);
  const isInBSC = !!(selectedBSCModel && selectedBSCPeriod);
  const isInModule = isInABC || isInBI || isInLogistics || isInForecast || isInBSC;

  const handleBackToModels = () => {
    setSelectedModel(null);
    setSelectedPeriod(null);
    navigate("/models");
  };

  const handleBackToBIModels = () => {
    setSelectedBIModel(null);
    setSelectedBIPeriod(null);
    navigate("/bi-express");
  };

  const handleBackToLogisticsModels = () => {
    setSelectedLogisticsModel(null);
    setSelectedLogisticsPeriod(null);
    navigate("/logistics");
  };

  const handleBackToForecastModels = () => {
    setSelectedForecastModel(null);
    setSelectedForecastPeriod(null);
    navigate("/forecast");
  };

  const handleBackToBSCModels = () => {
    setSelectedBSCModel(null);
    setSelectedBSCPeriod(null);
    navigate("/bsc");
  };

  const toolsNav = isInABC
    ? [
        { title: "Diccionarios", url: "/dictionaries", icon: BookOpen },
        { title: "Dimensiones", url: "/dimensions", icon: Layers },
        { title: "Asignaciones", url: "/assignments", icon: ArrowRightLeft },
      ]
    : isInBI
    ? [
        { title: "Plantillas", url: "/bi-express/catalog", icon: Upload },
        { title: "Selector KPIs", url: "/bi-express/kpi-selector", icon: Settings2 },
        { title: "Análisis", url: "/bi-express/dashboard", icon: BarChart3 },
        ...Array.from(loadedTemplates).map((id) => ({
          title: `${id} · ${TEMPLATE_CATALOG[id].name}`,
          url: `/bi-express/data/${id}`,
          icon: Database,
        })),
      ]
    : isInLogistics
    ? [
        { title: "Datos de Entrada", url: "/logistics/inputs", icon: Settings2 },
        { title: "Resultados", url: "/logistics/results", icon: Target },
        { title: "What-If", url: "/logistics/whatif", icon: AlertTriangle },
        { title: "Sensibilidad", url: "/logistics/sensitivity", icon: BarChart3 },
      ]
    : isInForecast
    ? [
        { title: "Datos de Entrada", url: "/forecast/data", icon: Database },
        { title: "Resultados", url: "/forecast/results", icon: LineChart },
      ]
    : isInBSC
    ? [
        { title: "Estrategia", url: "/bsc/strategy", icon: Target },
        { title: "Analítica", url: "/bsc/analytics", icon: BarChart3 },
      ]
    : [
        { title: "Costeo ABC", url: "/models", icon: Database },
        { title: "BI Express", url: "/bi-express", icon: TrendingUp },
        { title: "Eficiencia logística", url: "/logistics", icon: Truck },
        { title: "Forecast", url: "/forecast", icon: LineChart },
        { title: "Estrategia BSC", url: "/bsc", icon: Target },
      ];

  const reportsNav = [
    { title: "Distribución de costos", url: "/reports", icon: PieChart },
    { title: "Rentabilidad", url: "/profitability", icon: BarChart3 },
    { title: "Sensibilidad", url: "/sensitivity", icon: FlaskConical },
    { title: "Resumen ejecutivo", url: "/executive-summary", icon: FileSpreadsheet },
    { title: "Análisis Cruzado", url: "/cross-analysis", icon: TableProperties },
    { title: "Comparativo períodos", url: "/period-comparison", icon: CalendarRange },
    { title: "Validación del modelo", url: "/model-health", icon: ShieldCheck },
  ];

  // Determine which active model to show in header
  const activeModel = isInABC ? selectedModel : isInBI ? selectedBIModel : isInLogistics ? selectedLogisticsModel : isInForecast ? selectedForecastModel : isInBSC ? selectedBSCModel : null;
  const activePeriod = isInABC ? selectedPeriod : isInBI ? selectedBIPeriod : isInLogistics ? selectedLogisticsPeriod : isInForecast ? selectedForecastPeriod : isInBSC ? selectedBSCPeriod : null;
  const handleBack = isInABC ? handleBackToModels : isInBI ? handleBackToBIModels : isInLogistics ? handleBackToLogisticsModels : isInForecast ? handleBackToForecastModels : handleBackToBSCModels;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 flex flex-col gap-4">
        <div className="relative flex h-10 w-full items-center">
          <img
            src="/images/logo-bb.png"
            alt="The Black Box"
            className={`absolute left-0 h-10 w-auto transition-all duration-300 ease-in-out origin-left dark:hidden ${
              collapsed ? "opacity-0 scale-90 invisible" : "opacity-100 scale-100 visible delay-100"
            }`}
          />
          <img
            src="/images/logo-white.png"
            alt="The Black Box"
            className={`absolute left-0 h-10 w-auto transition-all duration-300 ease-in-out origin-left hidden dark:block ${
              collapsed ? "opacity-0 scale-90 invisible" : "opacity-100 scale-100 visible delay-100"
            }`}
          />
          <img
            src="/images/logo-icon.png"
            alt="TBB"
            className={`absolute left-0 top-1 h-8 w-8 object-contain transition-all duration-300 ease-in-out origin-left ${
              collapsed ? "opacity-100 scale-100 visible delay-100" : "opacity-0 scale-90 invisible"
            }`}
          />
        </div>
        {!collapsed && activeModel && activePeriod && (
          <div className="bg-muted/50 p-3 rounded-md border border-border/50 flex items-center gap-3 group">
            <button
              onClick={handleBack}
              className="p-1.5 rounded-md hover:bg-background/80 text-muted-foreground hover:text-foreground transition-colors shrink-0 bg-background/50"
              title="Volver a seleccionar modelo"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex flex-col gap-0.5 overflow-hidden">
              <span className="text-base font-semibold text-primary line-clamp-1">
                {activeModel.name}
              </span>
              <span className="text-xs text-muted-foreground line-clamp-1">
                Período: {activePeriod.name}
              </span>
              {isInABC && activeModel.base_currency && (
                <span className="text-xs text-muted-foreground">
                  Moneda: {activeModel.base_currency} {getCurrencySymbol(activeModel.base_currency)}
                </span>
              )}
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {!isInModule && (
          <>
            <NavSection label="General" items={userRole === "admin" ? adminNav : mainNav} collapsed={collapsed} />
            {isSuperAdmin && (
              <NavSection label="Superadmin" items={[{ title: "Clientes", url: "/superadmin", icon: ShieldCheck }]} collapsed={collapsed} />
            )}
          </>
        )}
        <NavSection
          label={
            isInABC ? "Costeo ABC"
            : isInBI ? "BI Express"
            : isInLogistics ? "Eficiencia Logística"
            : isInForecast ? "Forecast"
            : isInBSC ? "Estrategia BSC"
            : "Herramientas de análisis"
          }
          items={toolsNav}
          collapsed={collapsed}
        />
        {isInABC && (
          <NavSection label="Reportes" items={reportsNav} collapsed={collapsed} />
        )}
      </SidebarContent>

    </Sidebar>
  );
}
