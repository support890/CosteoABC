import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Check,
  ArrowRight,
  BarChart3,
  Target,
  Shield,
  Zap,
  Users,
  Globe,
  Moon,
  Sun,
  Menu,
  X,
  Upload,
  Settings2,
  LineChart,
  Briefcase,
  GraduationCap,
  FileSpreadsheet,
  PieChart,
  Truck,
  TrendingUp,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

/* ───── smooth scroll helper ───── */
function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

/* ───── data ───── */
const features = [
  {
    slug: "costeo-abc",
    icon: BarChart3,
    title: "Costeo ABC",
    description:
      "Motor de cálculo recursivo de n-niveles que rastrea Recursos, Actividades y Objetos de Costo con trazabilidad y precisión absoluta.",
  },
  {
    slug: "bi-express",
    icon: PieChart,
    title: "BI Express",
    description:
      "Dashboards de inteligencia de negocio con KPIs personalizables, catálogo de indicadores y visualizaciones interactivas en tiempo real.",
  },
  {
    slug: "logistica",
    icon: Truck,
    title: "Eficiencia Logística",
    description:
      "Modela y optimiza costos logísticos con análisis What-If, sensibilidad y resultados desagregados por ruta, canal y cliente.",
  },
  {
    slug: "forecast",
    icon: TrendingUp,
    title: "Forecast",
    description:
      "Proyecta ingresos y demanda con múltiples métodos de pronóstico. Compara escenarios y alinea proyecciones con tu estrategia.",
  },
  {
    slug: "estrategia-bsc",
    icon: Target,
    title: "Estrategia BSC",
    description:
      "Mapas estratégicos, KPIs jerárquicos y alertas automatizadas para alinear la ejecución operativa con la visión organizacional.",
  },
  {
    slug: "seguridad-multi-tenant",
    icon: Shield,
    title: "Seguridad Multi-Tenant",
    description:
      "Aislamiento celular por empresa con roles granulares, Row-Level Security y arquitectura cloud enterprise.",
  },
];

const steps = [
  {
    icon: Upload,
    step: "1",
    title: "Conecta tus datos",
    description:
      "Importa desde Excel o conecta tu ERP. El sistema valida la integridad, detecta inconsistencias y estructura tus datos automáticamente.",
  },
  {
    icon: Settings2,
    step: "2",
    title: "Elige tu herramienta",
    description:
      "Activa los módulos que necesitas: Costeo ABC, BI Express, Logística, Forecast o BSC. Cada uno se configura de forma independiente.",
  },
  {
    icon: LineChart,
    step: "3",
    title: "Analiza en tiempo real",
    description:
      "Dashboards, mapas estratégicos, pronósticos y análisis de sensibilidad se actualizan instantáneamente con tus datos más recientes.",
  },
  {
    icon: Target,
    step: "4",
    title: "Decide con confianza",
    description:
      "Precios, estrategia, logística, presupuesto — toma cada decisión respaldada por modelos cuantitativos, no por intuición.",
  },
];

const personas = [
  {
    icon: Briefcase,
    title: "Ejecutivo / Director",
    description:
      "Toma decisiones estratégicas con visibilidad completa: rentabilidad, KPIs, forecast y logística en un solo lugar. Sin esperar reportes manuales.",
    benefits: [
      "Dashboards ejecutivos en tiempo real",
      "BSC con mapas estratégicos visuales",
      "Alertas proactivas antes de que escalen",
    ],
  },
  {
    icon: FileSpreadsheet,
    title: "Analista / Controller",
    description:
      "Deja de perseguir datos en hojas de cálculo. Modelos de costos, pronósticos y análisis de sensibilidad con trazabilidad completa y cero errores.",
    benefits: [
      "Trazabilidad Recurso → Objeto de Costo",
      "Forecast con múltiples métodos",
      "Análisis What-If y sensibilidad",
    ],
  },
  {
    icon: GraduationCap,
    title: "Dueño de Negocio / Consultor",
    description:
      "Gestiona múltiples empresas desde una cuenta. Implementa modelos en días y ofrece reportes profesionales que justifican tus honorarios.",
    benefits: [
      "Multi-empresa desde $40/cliente/mes",
      "Suite completa de 5 herramientas",
      "Onboarding automatizado en minutos",
    ],
  },
];

const plans = [
  {
    name: "Starter",
    audience: "Para la PyME individual",
    price: 49,
    period: "/mes",
    annualNote: "o $39/mes facturado anualmente",
    description:
      "Accede a las 5 herramientas analíticas de The Black Box en la nube.",
    features: [
      "1 Empresa (Tenant)",
      "Hasta 3 usuarios",
      "1 Modelo de Costos activo",
      "1 Tablero BSC",
      "Importación por Excel",
      "Soporte por email",
    ],
    cta: "Iniciar prueba gratuita",
    highlighted: false,
  },
  {
    name: "Pro",
    audience: "Para Consultores y PyMEs medianas",
    price: 199,
    period: "/mes",
    annualNote: "o $159/mes facturado anualmente",
    description:
      "Gestiona múltiples empresas, simulaciones ilimitadas y alertas automatizadas.",
    features: [
      "Hasta 5 Empresas (Tenants)",
      "Usuarios ilimitados",
      "Modelos y simulaciones ilimitados",
      "Módulo completo de Alertas",
      "Reportes OLAP avanzados",
      "Soporte prioritario",
    ],
    cta: "Iniciar prueba gratuita",
    highlighted: true,
    badge: "Más popular",
  },
  {
    name: "Enterprise",
    audience: "Para corporativos y firmas grandes",
    price: null,
    period: "",
    annualNote: "Contratos a medida",
    description:
      "Base de datos aislada, conectores ERP nativos y SLA dedicado.",
    features: [
      "Tenants y usuarios ilimitados",
      "Base de datos aislada (Silo)",
      "API nativa (SAP, Oracle, Defontana)",
      "SLA garantizado (99.9%)",
      "Soporte dedicado 24/7",
      "Onboarding personalizado",
    ],
    cta: "Contactar ventas",
    highlighted: false,
    contactLink: true,
  },
];

const comparisonRows = [
  {
    feature: "Empresas (Tenants)",
    starter: "1",
    pro: "Hasta 5",
    enterprise: "Ilimitados",
  },
  {
    feature: "Usuarios",
    starter: "3",
    pro: "Ilimitados",
    enterprise: "Ilimitados",
  },
  {
    feature: "Modelos de costos",
    starter: "1",
    pro: "Ilimitados",
    enterprise: "Ilimitados",
  },
  {
    feature: "Tableros BSC",
    starter: "1",
    pro: "Ilimitados",
    enterprise: "Ilimitados",
  },
  { feature: "Importación Excel", starter: true, pro: true, enterprise: true },
  {
    feature: "Conectores API / ERP",
    starter: false,
    pro: false,
    enterprise: true,
  },
  {
    feature: "Alertas automatizadas",
    starter: false,
    pro: true,
    enterprise: true,
  },
  { feature: "Reportes OLAP", starter: false, pro: true, enterprise: true },
  {
    feature: "Simulaciones de escenarios",
    starter: false,
    pro: true,
    enterprise: true,
  },
  {
    feature: "Base de datos aislada (Silo)",
    starter: false,
    pro: false,
    enterprise: true,
  },
  { feature: "SLA garantizado", starter: false, pro: false, enterprise: true },
  {
    feature: "Soporte dedicado 24/7",
    starter: false,
    pro: false,
    enterprise: true,
  },
];

const testimonials = [
  {
    quote:
      "Pasamos de cerrar costos en 5 días con Excel a hacerlo en 4 horas. La visibilidad que nos da ABC sobre la rentabilidad por cliente cambió completamente nuestra estrategia de precios.",
    name: "María González",
    role: "CFO, Logística Austral",
  },
  {
    quote:
      "Gestiono 4 clientes desde una sola cuenta. El ROI del plan Pro se paga solo: cobro $500/mes por consultoría y el software me cuesta $199. Es un diferenciador enorme.",
    name: "Carlos Mendoza",
    role: "Consultor Financiero Independiente",
  },
  {
    quote:
      "El Balanced Scorecard integrado con los costos ABC nos permitió alinear KPIs de planta con objetivos estratégicos. Ahora el directorio tiene visibilidad real del desempeño.",
    name: "Ana Rojas",
    role: "Gerente de Operaciones, InduTech",
  },
  {
    quote:
      "Antes no sabíamos cuáles clientes eran rentables. Con The Black Box descubrimos que el 30% de nuestros clientes generaban pérdidas. Ajustamos precios y el margen subió un 18%.",
    name: "Roberto Fuentes",
    role: "Director Comercial, Distribuidora del Pacífico",
  },
  {
    quote:
      "La implementación fue increíblemente rápida. En 3 días teníamos nuestro primer modelo ABC funcionando con datos reales. El soporte respondió cada duda en menos de 2 horas.",
    name: "Camila Ortiz",
    role: "Controller, Grupo Textil Andino",
  },
  {
    quote:
      "Como auditor, valoro la trazabilidad total. Puedo rastrear cada peso desde el recurso original hasta el objeto de costo final. Cero errores de redondeo, cero cajas negras.",
    name: "Eduardo Vargas",
    role: "Auditor Senior, Deloitte Chile",
  },
  {
    quote:
      "Reemplazamos 12 hojas de cálculo interconectadas por un solo sistema. Los errores de fórmula que nos costaban semanas de revisión simplemente desaparecieron.",
    name: "Patricia Muñoz",
    role: "Jefa de Contabilidad, Alimentos del Sur",
  },
  {
    quote:
      "El módulo de alertas nos salvó el trimestre. Detectamos un desvío de costos en producción 3 semanas antes del cierre y pudimos actuar a tiempo.",
    name: "Andrés Salazar",
    role: "Gerente de Planta, MetalPro Industries",
  },
  {
    quote:
      "Mis clientes quedaron impresionados con los reportes. El nivel de detalle y profesionalismo que puedo entregar ahora justifica completamente mis honorarios de consultoría.",
    name: "Valentina Reyes",
    role: "Consultora Financiera, VR Consulting",
  },
  {
    quote:
      "La seguridad multi-tenant nos dio la confianza para migrar. Saber que los datos de cada filial están completamente aislados fue clave para la aprobación del directorio.",
    name: "Francisco Herrera",
    role: "CTO, Holding Comercial del Norte",
  },
  {
    quote:
      "Pasé de cobrar $200/hora por análisis manual a entregar reportes automatizados de mayor calidad. Mi productividad como consultor se triplicó.",
    name: "Diego Ramírez",
    role: "Consultor ABC, Ramírez & Asociados",
  },
  {
    quote:
      "Los dashboards en tiempo real cambiaron nuestra reunión de directorio. Ya no presentamos datos de hace 2 meses, sino información del día anterior.",
    name: "Lucía Fernández",
    role: "CEO, Logística Express",
  },
  {
    quote:
      "Descubrimos que nuestro producto estrella en ventas era el menos rentable. Sin ABC, hubiéramos seguido subsidiándolo con los demás productos.",
    name: "Martín Aguirre",
    role: "Director Financiero, BioFarma SA",
  },
  {
    quote:
      "La importación desde Excel fue un game changer. Subí 3 años de datos históricos en una tarde y el sistema los procesó sin errores. Migración perfecta.",
    name: "Carolina Vega",
    role: "Analista de Costos, Constructora Pacífico",
  },
  {
    quote:
      "Nuestro equipo de 15 personas adoptó la plataforma en una semana. La interfaz es tan intuitiva que casi no necesitamos capacitación formal.",
    name: "Ignacio Torres",
    role: "Gerente de Administración, TechSolutions",
  },
  {
    quote:
      "El plan Enterprise con base de datos aislada nos permitió cumplir con los requisitos de compliance de nuestra casa matriz en Europa. Seguridad de primer nivel.",
    name: "Sofía Castellanos",
    role: "CISO, Pharma International",
  },
  {
    quote:
      "The Black Box nos mostró que el costo de servir a clientes rurales era 4x mayor que a urbanos. Reestructuramos rutas y ahorramos $120K anuales.",
    name: "Alejandro Pinto",
    role: "VP Operaciones, Distribuidora Nacional",
  },
  {
    quote:
      "Como profesor de costos, uso The Black Box en mis clases. Los estudiantes entienden mejor la metodología cuando pueden ver los cálculos en tiempo real.",
    name: "Dr. Ricardo Morales",
    role: "Profesor de Contabilidad, Universidad de Chile",
  },
  {
    quote:
      "La funcionalidad de períodos nos permite comparar costos mes a mes. Identificamos estacionalidades que antes pasaban desapercibidas en nuestras hojas de cálculo.",
    name: "Natalia Bravo",
    role: "Analista Senior, Retail Grupo Omega",
  },
  {
    quote:
      "Implementamos el BSC con 4 perspectivas y 32 KPIs. El mapa estratégico visual hizo que por primera vez toda la organización entienda hacia dónde vamos.",
    name: "Gonzalo Ríos",
    role: "Gerente General, Manufacturas del Centro",
  },
  {
    quote:
      "El cálculo recursivo de n-niveles es impresionante. Tenemos 8 niveles de distribución y el sistema los resuelve en segundos, sin los errores circulares de Excel.",
    name: "Isabel Contreras",
    role: "Directora de Finanzas, Energía Verde SA",
  },
  {
    quote:
      "Migrar desde SAP fue más fácil de lo que pensábamos. Exportamos a Excel, importamos en The Black Box, y en 2 horas teníamos el modelo funcionando.",
    name: "Juan Pablo Soto",
    role: "IT Manager, Industrias Consolidadas",
  },
  {
    quote:
      "El soporte es excepcional. Tuve un problema a las 11pm antes de una presentación al directorio y me respondieron en 20 minutos. Eso no tiene precio.",
    name: "Marcela Díaz",
    role: "CFO, Grupo Hotelero Austral",
  },
  {
    quote:
      "Con 3 empresas en el plan Pro, el costo por cliente es ridículamente bajo. The Black Box se convirtió en mi herramienta principal de consultoría.",
    name: "Tomás Navarro",
    role: "Socio Fundador, Navarro Consulting Group",
  },
];

const faqs = [
  {
    q: "¿Necesito conocimientos previos de ABC para usar la plataforma?",
    a: "No. The Black Box incluye plantillas pre-configuradas y guías paso a paso basadas en la metodología Sixtina. Si nunca has usado costeo por actividades, el sistema te guía en la creación de tu primer modelo. Además, ofrecemos webinars de onboarding gratuitos.",
  },
  {
    q: "¿Puedo importar mis datos desde Excel?",
    a: "Sí. Todos los planes incluyen importación desde Excel. Solo necesitas un archivo con tu catálogo contable (cuentas de gasto) y el sistema crea automáticamente los diccionarios. También validamos la integridad de los datos antes de procesarlos.",
  },
  {
    q: "¿Qué pasa con mis datos si cancelo?",
    a: "Tus datos se mantienen por 30 días tras la cancelación para que puedas exportarlos (CSV o Excel). Después de ese período, se eliminan permanentemente de nuestros sistemas en un plazo máximo de 90 días, incluyendo backups.",
  },
  {
    q: "¿Cómo funciona el aislamiento de datos entre empresas?",
    a: "Los planes Starter y Pro usan aislamiento lógico con Row-Level Security: cada consulta a la base de datos incluye automáticamente el contexto de tu empresa via JWT. El plan Enterprise ofrece aislamiento físico con base de datos dedicada en VPC independiente.",
  },
  {
    q: "¿Puedo cambiar de plan en cualquier momento?",
    a: "Sí. Puedes escalar de Starter a Pro o Enterprise en cualquier momento. El cambio se aplica inmediatamente y se prorratea la diferencia. Si reduces tu plan, el cambio se aplica al siguiente ciclo de facturación.",
  },
  {
    q: "¿Ofrecen descuentos para facturación anual?",
    a: "Sí. La facturación anual tiene un 20% de descuento (equivalente a 2 meses gratis). Starter: $39/mes, Pro: $159/mes. Enterprise tiene precios personalizados con contratos anuales.",
  },
  {
    q: "¿Se integra con mi ERP (SAP, Oracle, Defontana)?",
    a: "El plan Enterprise incluye conectores API nativos para los principales ERPs. Los planes Starter y Pro trabajan con importación por Excel, que es compatible con cualquier sistema que exporte a este formato.",
  },
];

const integrationsRow1 = [
  { name: "Excel", logo: "/images/logos/excel.svg" },
  { name: "SAP", logo: "/images/logos/sap.svg" },
  { name: "Oracle", logo: "/images/logos/oracle.svg" },
  { name: "Defontana", logo: "/images/logos/defontana.svg" },
  { name: "QuickBooks", logo: "/images/logos/quickbooks.svg" },
  { name: "CONTPAQi", logo: "/images/logos/contpaqi.svg" },
  { name: "Siigo", logo: "/images/logos/siigo.svg" },
];
const integrationsRow2 = [
  { name: "Sage", logo: "/images/logos/sage.svg" },
  { name: "Xero", logo: "/images/logos/xero.svg" },
  { name: "Odoo", logo: "/images/logos/odoo.svg" },
  { name: "Zoho Books", logo: "/images/logos/zoho.svg" },
  { name: "Microsoft", logo: "/images/logos/microsoft.svg" },
  { name: "AWS", logo: "/images/logos/aws.svg" },
  { name: "Google Cloud", logo: "/images/logos/gcloud.svg" },
];

/* ───── Component ───── */
export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);
  const dragState = useRef({ isDragging: false, startX: 0, startDelay: 0, inverted: false, row: null as HTMLDivElement | null });
  const ANIM_DURATION = 60;

  const onDragStart = (e: React.MouseEvent, ref: React.RefObject<HTMLDivElement>, inverted: boolean) => {
    const el = ref.current;
    if (!el) return;
    const currentDelay = parseFloat(window.getComputedStyle(el).animationDelay) || 0;
    el.style.animationPlayState = "paused";
    el.style.cursor = "grabbing";
    dragState.current = { isDragging: true, startX: e.clientX, startDelay: currentDelay, inverted, row: el };
  };

  const onDragEnd = () => {
    const { row } = dragState.current;
    if (!row) return;
    dragState.current.isDragging = false;
    row.style.animationPlayState = "running";
    row.style.cursor = "grab";
  };

  const onDragMove = (e: React.MouseEvent) => {
    const { isDragging, startX, startDelay, inverted, row } = dragState.current;
    if (!isDragging || !row) return;
    e.preventDefault();
    const deltaX = e.clientX - startX;
    const contentWidth = row.scrollWidth / 2;
    const deltaTime = (deltaX / contentWidth) * ANIM_DURATION * (inverted ? -1 : 1);
    row.style.animationDelay = `${startDelay + deltaTime}s`;
  };

  useEffect(() => {
    if (location.hash) {
      const el = document.querySelector(location.hash);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 100);
      }
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen bg-background text-foreground scroll-smooth">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <img src={theme === "dark" ? "/images/logo-white.png" : "/images/logo-bb.png"} alt="The Black Box" className="h-12" />

          {/* Desktop nav */}
          <div className="hidden items-center gap-2 md:flex">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="mr-2"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => scrollTo("how-it-works")}
            >
              Cómo funciona
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => scrollTo("features")}
            >
              Funcionalidades
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => scrollTo("pricing")}
            >
              Precios
            </Button>
            <Button variant="ghost" size="sm" onClick={() => scrollTo("faq")}>
              FAQ
            </Button>
            <Button asChild size="sm" variant="outline" className="ml-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white">
              <a href="https://wa.link/33h5va" target="_blank" rel="noopener noreferrer">
                <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </a>
            </Button>
            <Button asChild size="sm">
              <Link to="/login">Ingresar</Link>
            </Button>
          </div>

          {/* Mobile hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="border-t border-border/50 bg-background px-6 py-4 md:hidden">
            <div className="flex flex-col gap-2">
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => {
                  scrollTo("how-it-works");
                  setMobileMenuOpen(false);
                }}
              >
                Cómo funciona
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => {
                  scrollTo("features");
                  setMobileMenuOpen(false);
                }}
              >
                Funcionalidades
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => {
                  scrollTo("pricing");
                  setMobileMenuOpen(false);
                }}
              >
                Precios
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => {
                  scrollTo("faq");
                  setMobileMenuOpen(false);
                }}
              >
                FAQ
              </Button>
              <Button asChild variant="outline" className="mt-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white justify-start">
                <a href="https://wa.link/33h5va" target="_blank" rel="noopener noreferrer">
                  <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </a>
              </Button>
              <Button asChild className="mt-2">
                <Link to="/login">Ingresar</Link>
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-6 py-24 lg:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
        {/* Decorative floating shapes */}
        <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-primary/5 blur-3xl -z-10" />
        <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-primary/3 blur-3xl -z-10" />
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Text */}
            <div className="text-center lg:text-left">
              <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-xs">
                14 días de prueba gratuita &mdash; Sin tarjeta de crédito
              </Badge>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                La plataforma para
                <br />
                <span className="text-primary">quienes deciden.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
                Suite integrada de herramientas analíticas como Costeo ABC,
                BI Express, Eficiencia Logística, Forecast, Estrategia BSC —
                diseñada para que ejecutivos, analistas y dueños de negocio
                tomen decisiones basadas en datos reales, no en intuición.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
                <Button size="lg" className="gap-2 px-8" asChild>
                  <Link to="/register">
                    Comenzar gratis
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/login">Ver demo</Link>
                </Button>
              </div>
            </div>
            {/* Hero image */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative">
                <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent blur-2xl" />
                <img
                  src="/images/hero-abc-costing.png"
                  alt="The Black Box - Plataforma de costeo basado en actividades"
                  className="relative rounded-2xl shadow-2xl shadow-primary/10 border border-border/30 w-full max-w-2xl object-cover"
                />
              </div>
            </div>
          </div>
          {/* Integration logos carousel */}
          <div className="mt-16 text-center">
            <p className="text-2xl text-muted-foreground mb-6">Compatible con</p>
            <div className="relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-10" />
              <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-10" />
              {/* Row 1 - left */}
              <div className="flex animate-scroll hover:[animation-play-state:paused] w-max gap-12 items-center mb-6">
                {[...integrationsRow1, ...integrationsRow1].map((item, i) => (
                  <img
                    key={`r1-${item.name}-${i}`}
                    src={item.logo}
                    alt={item.name}
                    className="h-10 w-auto object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all shrink-0"
                  />
                ))}
              </div>
              {/* Row 2 - right */}
              <div className="flex animate-scroll-reverse hover:[animation-play-state:paused] w-max gap-12 items-center">
                {[...integrationsRow2, ...integrationsRow2].map((item, i) => (
                  <img
                    key={`r2-${item.name}-${i}`}
                    src={item.logo}
                    alt={item.name}
                    className="h-10 w-auto object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all shrink-0"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social Proof Carousel ── */}
      <section className="border-t border-border/50 bg-muted/20 py-16 overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 mb-10 text-center">
          <h2 className="text-3xl font-bold">Lo que dicen nuestros usuarios</h2>
          <p className="mt-3 text-muted-foreground">
            Más de 200 empresas ya transformaron su toma de decisiones con
            The Black Box.
          </p>
        </div>

        {/* Row 1 - scrolls left */}
        <div className="relative mb-6">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-muted/80 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-muted/80 to-transparent z-10 pointer-events-none" />
          <div
            ref={row1Ref}
            className="flex gap-6 animate-scroll-left hover:[animation-play-state:paused] cursor-grab select-none"
            onMouseDown={(e) => onDragStart(e, row1Ref, false)}
            onMouseUp={onDragEnd}
            onMouseLeave={onDragEnd}
            onMouseMove={onDragMove}
          >
            {[...testimonials.slice(0, 12), ...testimonials.slice(0, 12)].map(
              (t, i) => (
                <Card
                  key={`r1-${i}`}
                  className="border-border/50 shrink-0 w-[350px]"
                >
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <svg
                          key={s}
                          className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed italic mb-4">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
                        {t.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{t.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.role}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ),
            )}
          </div>
        </div>

        {/* Row 2 - scrolls right */}
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-muted/80 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-muted/80 to-transparent z-10 pointer-events-none" />
          <div
            ref={row2Ref}
            className="flex gap-6 animate-scroll-right hover:[animation-play-state:paused] cursor-grab select-none"
            onMouseDown={(e) => onDragStart(e, row2Ref, true)}
            onMouseUp={onDragEnd}
            onMouseLeave={onDragEnd}
            onMouseMove={onDragMove}
          >
            {[...testimonials.slice(12), ...testimonials.slice(12)].map(
              (t, i) => (
                <Card
                  key={`r2-${i}`}
                  className="border-border/50 shrink-0 w-[350px]"
                >
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <svg
                          key={s}
                          className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed italic mb-4">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
                        {t.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{t.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.role}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ),
            )}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section
        id="how-it-works"
        className="border-t border-border/50 px-6 py-20"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-4xl font-bold text-primary">
              Sé calculador y toma la mejor decisión
            </p>
            <h2 className="text-3xl font-bold">Cómo funciona</h2>
            <p className="mt-3 text-muted-foreground">
              De tus datos a decisiones estratégicas en 4 pasos.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.step} className="relative text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <s.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  {s.step}
                </div>
                <h3 className="mb-2 font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Visual: Rentabilidad Flow ── */}
      <section className="border-t border-border/50 bg-muted/20 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="relative flex justify-center">
              <div className="absolute -inset-4 rounded-2xl bg-gradient-to-tr from-primary/10 to-transparent blur-2xl" />
              <img
                src="/images/rentabilidad-tablet.png"
                alt="De recursos a rentabilidad - flujo ABC Costing"
                className="relative rounded-2xl shadow-xl border border-border/30 w-full max-w-xl object-cover"
              />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-4">
                De datos dispersos a
                <br />
                <span className="text-primary">decisiones claras</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                The Black Box centraliza tus datos financieros, operativos y
                estratégicos en una sola plataforma. Cada módulo resuelve un
                problema de negocio concreto: saber qué cuesta, qué rinde,
                qué se proyecta y hacia dónde va la organización.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-background/80 border border-border/50 p-4">
                  <p className="text-2xl font-bold text-primary">20+</p>
                  <p className="text-xs text-muted-foreground">
                    Herramientas analíticas integradas
                  </p>
                </div>
                <div className="rounded-lg bg-background/80 border border-border/50 p-4">
                  <p className="text-2xl font-bold text-primary">80%</p>
                  <p className="text-xs text-muted-foreground">
                    Menos tiempo en análisis manuales
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Para quién es ── */}
      <section
        id="personas"
        className="relative border-t border-border/50 px-6 py-20 overflow-hidden"
      >
        {/* Decorative dot pattern */}
        <div
          className="absolute inset-0 -z-10 opacity-[0.02]"
          style={{
            backgroundImage:
              "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold">¿Para quién es The Black Box?</h2>
            <p className="mt-3 text-muted-foreground">
              Diseñado para quienes toman decisiones y necesitan datos, no suposiciones.
            </p>
            <img
              src="/images/businessman-abc.png"
              alt="Profesional usando The Black Box"
              className="mx-auto mt-8 w-full max-w-5xl rounded-2xl shadow-lg border border-border/30"
            />
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {personas.map((p) => (
              <Card key={p.title} className="border-border/50">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <p.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{p.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {p.description}
                  </p>
                  <ul className="space-y-2">
                    {p.benefits.map((b) => (
                      <li key={b} className="flex items-center gap-2 text-xs">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="border-t border-border/50 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold">
              5 herramientas. Una plataforma. Todas tus decisiones.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Cada módulo aborda un problema de negocio distinto. Úsalos de
              forma independiente o combinados para una visión 360° de tu operación.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Link key={f.slug} to={`/features/${f.slug}`}>
                <Card className="h-full border-border/50 transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 group cursor-pointer">
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <f.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mb-2 font-semibold group-hover:text-primary transition-colors">
                      {f.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {f.description}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Saber más <ArrowRight className="h-3 w-3" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Visual: Driver Relationships ── */}
      <section className="relative border-t border-border/50 bg-muted/20 px-6 py-20 overflow-hidden">
        {/* Decorative background dots */}
        <div
          className="absolute inset-0 -z-10 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold mb-4">
                Visualiza las{" "}
                <span className="text-primary">relaciones de costo</span> como
                nunca antes
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Conecta Recursos, Actividades y Objetos de Costo a través de
                drivers inteligentes. Nuestro motor recursivo rastrea cada
                centavo desde su origen hasta el producto o cliente final,
                eliminando la caja negra de la contabilidad tradicional.
              </p>
              <ul className="space-y-3">
                {[
                  "Drivers uniformes y extendidos",
                  "Reciprocidad automática entre centros de costo",
                  "Trazabilidad completa Recurso → Objeto de Costo",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative flex justify-center">
              <div className="absolute -inset-4 rounded-2xl bg-gradient-to-bl from-primary/15 to-transparent blur-2xl" />
              <img
                src="/images/driver-relationships.png"
                alt="ABC Costing - Relaciones de drivers entre recursos, actividades y objetos de costo"
                className="relative rounded-2xl shadow-xl border border-border/30 w-full max-w-lg object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing Cards ── */}
      <section
        id="pricing"
        className="border-t border-border/50 bg-muted/30 px-6 py-20"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold">
              Planes simples y transparentes
            </h2>
            <p className="mt-3 text-muted-foreground">
              Comienza con 14 días gratis. Sin tarjeta de crédito. Escala cuando
              crezcas.
            </p>
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative flex flex-col border-border/50 ${
                  plan.highlighted
                    ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]"
                    : ""
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary px-3 py-1 text-xs text-primary-foreground">
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-2 pt-8">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {plan.audience}
                  </p>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4 flex items-baseline gap-1">
                    {plan.price !== null ? (
                      <>
                        <span className="text-4xl font-extrabold">
                          ${plan.price}
                        </span>
                        <span className="text-muted-foreground">
                          USD{plan.period}
                        </span>
                      </>
                    ) : (
                      <span className="text-3xl font-extrabold">
                        Personalizado
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {plan.annualNote}
                  </p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col pt-4">
                  <p className="mb-6 text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                  <ul className="mb-8 flex-1 space-y-3">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.highlighted ? "default" : "outline"}
                    size="lg"
                    asChild
                  >
                    <Link to={plan.contactLink ? "/contact" : "/register"}>
                      {plan.cta}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Todos los precios en USD. Ahorra un 20% con facturación anual. IVA
            no incluido.
          </p>
        </div>
      </section>

      {/* ── Comparison Table ── */}
      <section className="border-t border-border/50 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h3 className="text-2xl font-bold text-center mb-8">
            Comparación detallada de planes
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 pr-4 text-left font-medium text-muted-foreground">
                    Funcionalidad
                  </th>
                  <th className="py-3 px-4 text-center font-medium">Starter</th>
                  <th className="py-3 px-4 text-center font-medium text-primary">
                    Pro
                  </th>
                  <th className="py-3 px-4 text-center font-medium">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.feature} className="border-b border-border/50">
                    <td className="py-3 pr-4 text-muted-foreground">
                      {row.feature}
                    </td>
                    {(["starter", "pro", "enterprise"] as const).map((plan) => {
                      const val = row[plan];
                      return (
                        <td key={plan} className="py-3 px-4 text-center">
                          {typeof val === "boolean" ? (
                            val ? (
                              <Check className="mx-auto h-4 w-4 text-primary" />
                            ) : (
                              <span className="text-muted-foreground/40">
                                —
                              </span>
                            )
                          ) : (
                            <span
                              className={
                                plan === "pro" ? "font-medium text-primary" : ""
                              }
                            >
                              {val}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section
        id="faq"
        className="border-t border-border/50 bg-muted/20 px-6 py-20"
      >
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold">Preguntas frecuentes</h2>
            <p className="mt-3 text-muted-foreground">
              Todo lo que necesitas saber antes de empezar.
            </p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-sm font-medium">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="relative border-t border-border/50 px-6 py-20 overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom,hsl(var(--primary)/0.06),transparent_60%)]" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl -z-10" />
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl -z-10" />
        <div className="mx-auto max-w-4xl text-center">
          <img
            src="/images/cta-final.png"
            alt="The Black Box plataforma"
            className="mx-auto mb-10 w-full max-w-2xl rounded-2xl shadow-lg border border-border/30 opacity-90"
          />
          <h2 className="text-3xl font-bold">
            Deja de adivinar. Empieza a decidir.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Únete a las empresas que ya están transformando sus datos operativos
            en ventaja competitiva con The Black Box.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" className="gap-2 px-8" asChild>
              <Link to="/register">
                Comenzar prueba gratuita
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/contact">Contactar ventas</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/50 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {/* Brand */}
            <div>
              <div className="mb-3">
                <img src={theme === "dark" ? "/images/logo-white.png" : "/images/logo-bb.png"} alt="The Black Box" className="h-10" />
              </div>
              <p className="text-xs text-muted-foreground">
                Plataforma cloud de gestión de costos ABC y Balanced Scorecard.
              </p>
            </div>
            {/* Producto */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Producto
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button
                    onClick={() => scrollTo("features")}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Funcionalidades
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollTo("pricing")}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Precios
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollTo("faq")}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    FAQ
                  </button>
                </li>
              </ul>
            </div>
            {/* Empresa */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Empresa
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    to="/contact"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Contacto
                  </Link>
                </li>
                <li>
                  <Link
                    to="/login"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Ingresar
                  </Link>
                </li>
                <li>
                  <Link
                    to="/register"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Registrarse
                  </Link>
                </li>
              </ul>
            </div>
            {/* Legal */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Legal
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    to="/terms"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Términos de Servicio
                  </Link>
                </li>
                <li>
                  <Link
                    to="/privacy"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Política de Privacidad
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/50 pt-6 text-center text-xs text-muted-foreground">
            <p>&copy; 2026 The Black Box. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
