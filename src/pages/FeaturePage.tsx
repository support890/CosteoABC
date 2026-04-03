import { useEffect } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Target,
  Shield,
  Zap,
  Users,
  Globe,
  Moon,
  Sun,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

interface FeatureDetail {
  slug: string;
  icon: LucideIcon;
  title: string;
  tagline: string;
  description: string;
  benefits: { title: string; text: string }[];
  highlights: string[];
  cta: string;
  image?: string;
}

const featureImages: Record<string, string> = {
  "costeo-abc": "/images/rentabilidad-tablet.png",
  "balanced-scorecard": "/images/rentabilidad-flow.png",
  "seguridad-multi-tenant": "/images/hero-abc-costing.png",
  "tiempo-real": "/images/rentabilidad-flow.png",
  "multi-empresa": "/images/driver-relationships.png",
  cloud: "/images/hero-abc-costing.png",
};

const featureData: Record<string, FeatureDetail> = {
  "costeo-abc": {
    slug: "costeo-abc",
    icon: BarChart3,
    title: "Costeo ABC",
    tagline: "Conoce el costo real de cada producto, servicio y cliente.",
    description:
      "El módulo de Costeo Basado en Actividades (ABC) implementa un motor de cálculo recursivo de n-niveles que rastrea con precisión absoluta el flujo de costos desde los Recursos, pasando por las Actividades, hasta los Objetos de Costo finales. A diferencia de la contabilidad tradicional que distribuye gastos de forma arbitraria, ABC identifica exactamente qué consume cada área, proceso y producto.",
    benefits: [
      {
        title: "Diccionario de Recursos",
        text: "Importa tu catálogo contable desde Excel. Cada cuenta de gasto se convierte en un recurso rastreable: salarios, alquileres, energía, depreciación y más. El sistema valida la integridad de los datos y detecta inconsistencias automáticamente.",
      },
      {
        title: "Diccionario de Actividades",
        text: "Define las actividades bajo la estructura 'Verbo + Sustantivo' (Auditar código, Liquidar sueldos, Producir en planta). Clasifícalas como Operativas, de Producción o de Apoyo. El sistema gestiona la reciprocidad: cuando RRHH asigna costos a TI y TI devuelve costos a RRHH, los bucles se resuelven automáticamente.",
      },
      {
        title: "Drivers Inteligentes",
        text: "Asigna costos con precisión usando drivers Extendidos (con o sin valor total) o Uniformes. Los drivers extendidos permiten identificar clientes que erosionan el margen — por ejemplo, un cliente que genera consultas pesadas en base de datos consume más recursos y su costo asignado lo refleja.",
      },
      {
        title: "Objetos de Costo",
        text: "Define los destinos finales del costo: productos, servicios, clientes, canales o proyectos. Visualiza la rentabilidad real de cada uno eliminando el 'síndrome de la caja negra' donde departamentos complejos como TI no pueden demostrar su eficiencia.",
      },
    ],
    highlights: [
      "Motor recursivo de n-niveles para distribuciones complejas",
      "Gestión automática de reciprocidad entre centros de costo",
      "Importación masiva desde Excel con validación de integridad",
      "Fórmula: Costo Neto = Costo Operativo + Recibido - Asignado",
      "Cero errores de redondeo en distribuciones recursivas",
      "Trazabilidad completa: Recurso → Actividad → Objeto de Costo",
    ],
    cta: "Descubre cuánto te cuesta realmente cada cliente",
  },
  "balanced-scorecard": {
    slug: "balanced-scorecard",
    icon: Target,
    title: "Balanced Scorecard",
    tagline: "Alinea la ejecución operativa con tu visión estratégica.",
    description:
      "El módulo BSC transforma tu estrategia en un sistema de gestión medible. Integra indicadores de gestión (KPIs) directamente con los resultados del motor ABC, creando un ciclo de retroalimentación en tiempo real entre lo que planificas y lo que realmente sucede. No es un póster decorativo — es un instrumento de mando.",
    benefits: [
      {
        title: "Mapas Estratégicos Dinámicos",
        text: "Visualiza las relaciones causa-efecto entre las 4 perspectivas del BSC: Financiera, Clientes, Procesos Internos y Aprendizaje. Los mapas se actualizan en tiempo real reflejando cambios en el consumo de recursos sin intervención manual.",
      },
      {
        title: "Árbol de KPIs Jerárquico",
        text: "Construye árboles de indicadores con ponderaciones por perspectiva. Cada KPI muestra su peso relativo, puntuación actual (0-10) y estado semafórico (verde/amarillo/rojo). Navega desde la visión global hasta el indicador más granular con un clic.",
      },
      {
        title: "Alertas Automatizadas",
        text: "Configura umbrales de alerta por KPI con prioridades (Baja, Moderada, Alta). Una alerta de prioridad 'Alta' ante un desvío en costos no es solo un aviso — es el disparador de una acción correctiva inmediata antes del cierre fiscal.",
      },
      {
        title: "Metas Dinámicas",
        text: "Establece objetivos con umbrales que se adaptan al contexto. Define rangos de tolerancia y el sistema clasifica automáticamente el desempeño, permitiendo identificar tendencias antes de que se conviertan en problemas.",
      },
    ],
    highlights: [
      "4 perspectivas: Financiera, Clientes, Procesos, Aprendizaje",
      "KPIs jerárquicos con ponderación y consolidación automática",
      "Sistema semafórico: verde (cumple), amarillo (riesgo), rojo (crítico)",
      "Integración nativa con resultados del motor ABC",
      "Diagramas de Gantt vinculados directamente a KPIs",
      "Alertas proactivas con priorización y destinatarios configurables",
    ],
    cta: "Convierte tu estrategia en resultados medibles",
  },
  "seguridad-multi-tenant": {
    slug: "seguridad-multi-tenant",
    icon: Shield,
    title: "Seguridad Multi-Tenant",
    tagline: "Aislamiento total por empresa. Cero compromiso en seguridad.",
    description:
      "La arquitectura celular garantiza que los datos de cada empresa estén completamente aislados. Ya sea que operes en modo Pool (recursos compartidos con aislamiento lógico) o Silo (VPC dedicada), cada inquilino tiene su propio contexto de seguridad con Row-Level Security y autenticación basada en JWT.",
    benefits: [
      {
        title: "Arquitectura Celular",
        text: "Cada célula es una unidad de aislamiento independiente. Los inquilinos de alta prioridad se encapsulan en su propia VPC (Silo), mientras que los estándar comparten recursos con políticas de aislamiento estrictas (Pool). El blast radius se contiene automáticamente.",
      },
      {
        title: "Control de Acceso Granular (RBAC)",
        text: "4 roles predefinidos con permisos específicos: Admin del Control Plane, Usuario Silo, Usuario Pool y Auditor de Telemetría. Cada rol tiene acceso limitado exactamente a lo que necesita, siguiendo el principio de mínimo privilegio.",
      },
      {
        title: "Row-Level Security",
        text: "El JWT de cada sesión porta el Tenant_ID y Cell_ID. El middleware inyecta automáticamente el contexto del inquilino en cada consulta a la base de datos, haciendo imposible el acceso cruzado entre empresas.",
      },
      {
        title: "Comunicaciones Seguras (mTLS)",
        text: "Todas las comunicaciones entre servicios están cifradas con mutual TLS. Los certificados se rotan automáticamente y la latencia del mesh se monitorea como métrica de primera clase para no sacrificar rendimiento por seguridad.",
      },
    ],
    highlights: [
      "Aislamiento por VPC (Silo) o namespace (Pool)",
      "JWT con contexto de Tenant_ID y Cell_ID en cada request",
      "Row-Level Security automática en capa de acceso a datos",
      "Mutual TLS (mTLS) obligatorio entre servicios",
      "Rotación automática de certificados",
      "0 incidentes de cruce de datos como SLA contractual",
    ],
    cta: "Protege los datos de tus clientes sin esfuerzo",
  },
  "tiempo-real": {
    slug: "tiempo-real",
    icon: Zap,
    title: "Tiempo Real",
    tagline: "Dashboards que reflejan la realidad, no el pasado.",
    description:
      "Los dashboards de The Black Box no son reportes estáticos — son instrumentos de vuelo que se actualizan al instante. Gauges SVG, gráficos de tendencia y mapas estratégicos alimentados por datos en tiempo real te permiten tomar decisiones antes de que los problemas escalen.",
    benefits: [
      {
        title: "Gauges de Rendimiento",
        text: "Indicadores tipo velocímetro que muestran el estado de cada KPI con zonas semafóricas (rojo/amarillo/verde). De un vistazo sabes si estás en zona de peligro, precaución o cumplimiento. Ideales para monitorear antes de que se agoten los recursos.",
      },
      {
        title: "Gráficos de Tendencia",
        text: "Visualiza la evolución de costos vs objetivos mes a mes. Los gráficos de barras comparan el desempeño real contra las metas, permitiendo identificar desviaciones antes del cierre fiscal y tomar acciones correctivas a tiempo.",
      },
      {
        title: "Mapa Estratégico Visual",
        text: "Las 4 perspectivas del BSC se muestran como tarjetas interactivas con los KPIs de cada una. Los colores semafóricos permiten una lectura instantánea de la salud estratégica de toda la organización.",
      },
      {
        title: "Visualización Inteligente",
        text: "Siguiendo las mejores prácticas: barras para comparar tendencias (<10 puntos), heatmaps para dimensiones complejas con códigos semafóricos, y gráficos de burbujas para analizar frecuencias e intensidades.",
      },
    ],
    highlights: [
      "Gauges SVG con zonas semafóricas configurables",
      "Gráficos de barras: Real vs Objetivo por período",
      "Mapas estratégicos con 4 perspectivas del BSC",
      "Latencia intra-celular monitorada < 50ms",
      "Actualización automática sin intervención manual",
      "Pipelines ETL para eliminar error humano en datos",
    ],
    cta: "Toma decisiones con datos de hoy, no de ayer",
  },
  "multi-empresa": {
    slug: "multi-empresa",
    icon: Users,
    title: "Multi-Empresa",
    tagline: "Una cuenta, múltiples clientes. El sueño del consultor.",
    description:
      "Diseñado para consultores financieros que gestionan la contabilidad de varios clientes simultáneamente. Desde una sola cuenta puedes administrar hasta 5 empresas independientes (o ilimitadas en Enterprise), cada una con sus propios modelos de costos, KPIs y usuarios — todo con aislamiento total de datos.",
    benefits: [
      {
        title: "Gestión Centralizada",
        text: "Panel único para administrar todos tus clientes. Cambia entre empresas con un clic sin cerrar sesión. Cada tenant tiene su propio espacio de datos completamente aislado, pero tú los supervisas todos desde un solo lugar.",
      },
      {
        title: "ROI para Consultores",
        text: "Absorbe el costo del software y cóbralo como parte de tu consultoría. Con el plan Pro a $199/mes gestionando 5 empresas, el costo por cliente es de ~$40/mes — una fracción de lo que cobras por tu servicio profesional.",
      },
      {
        title: "Onboarding Automatizado",
        text: "Dar de alta un nuevo cliente es inmediato. El sistema aprovisiona automáticamente su célula, configura el aislamiento de datos y crea los usuarios iniciales. Importa su catálogo contable desde Excel y está listo para trabajar.",
      },
      {
        title: "Reportes Comparativos",
        text: "Como consultor, puedes comparar el desempeño entre tus clientes (respetando la confidencialidad de cada uno). Identifica patrones, mejores prácticas y oportunidades de mejora que puedes ofrecer como valor agregado.",
      },
    ],
    highlights: [
      "Hasta 5 tenants en plan Pro, ilimitados en Enterprise",
      "Aislamiento total de datos entre empresas",
      "Cambio de contexto instantáneo entre clientes",
      "Onboarding automatizado con aprovisionamiento de celda",
      "Usuarios independientes por empresa",
      "Costo por cliente: ~$40/mes en plan Pro",
    ],
    cta: "Escala tu consultoría con tecnología",
  },
  cloud: {
    slug: "cloud",
    icon: Globe,
    title: "100% Cloud",
    tagline: "Sin servidores. Sin instalación. Sin límites.",
    description:
      "The Black Box corre completamente en la nube sobre una arquitectura AWS optimizada para rendimiento y escalabilidad. No necesitas instalar nada — accede desde cualquier navegador y dispositivo con la misma seguridad que un sistema enterprise on-premise, pero sin la complejidad de mantenerlo.",
    benefits: [
      {
        title: "Cero Instalación",
        text: "Abre tu navegador, inicia sesión y trabaja. Sin descargas, sin configuraciones de servidor, sin dependencias de sistema operativo. Funciona en Windows, Mac, Linux, tablets y móviles.",
      },
      {
        title: "Escalabilidad Automática",
        text: "La arquitectura híbrida escala verticalmente para ingesta masiva de transacciones y horizontalmente para cálculos intensivos de CPU. Las micro-células escalan de forma independiente según la demanda de cada inquilino.",
      },
      {
        title: "Disponibilidad 99.9%",
        text: "SLA garantizado con monitoreo de uptime en el Control Plane. La arquitectura celular asegura que un fallo en una célula no afecta a las demás — el blast radius se contiene automáticamente.",
      },
      {
        title: "Backups y Recuperación",
        text: "Tus datos están protegidos con backups automáticos y políticas de retención configurables. La recuperación ante desastres está integrada en la arquitectura, no es un complemento adicional.",
      },
    ],
    highlights: [
      "Arquitectura AWS con células de despliegue independientes",
      "Escalado vertical para IO-intensive, horizontal para CPU-intensive",
      "SLA de disponibilidad 99.9% por célula",
      "Acceso desde cualquier navegador y dispositivo",
      "Backups automáticos con retención configurable",
      "Actualizaciones continuas sin downtime",
    ],
    cta: "Empieza en minutos, no en meses",
  },
};

export default function FeaturePage() {
  const { slug } = useParams<{ slug: string }>();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  const feature = slug ? featureData[slug] : undefined;

  if (!feature) {
    return <Navigate to="/" replace />;
  }

  const Icon = feature.icon;
  const slugs = Object.keys(featureData);
  const currentIndex = slugs.indexOf(feature.slug);
  const prevFeature =
    currentIndex > 0 ? featureData[slugs[currentIndex - 1]] : null;
  const nextFeature =
    currentIndex < slugs.length - 1
      ? featureData[slugs[currentIndex + 1]]
      : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/images/logo-tbb.png" alt="The Black Box" className="h-8" />
            <span className="text-lg font-bold">The Black Box</span>
          </Link>
          <div className="flex items-center gap-2">
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
            <Button variant="ghost" asChild>
              <Link to="/#features">Funcionalidades</Link>
            </Button>
            <Button asChild>
              <Link to="/login">Ingresar</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/50 px-6 py-20">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="absolute top-10 right-0 h-80 w-80 rounded-full bg-primary/5 blur-3xl -z-10" />
        <div className="mx-auto max-w-6xl">
          <Link
            to="/#features"
            className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Todas las funcionalidades
          </Link>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <Badge variant="secondary" className="mb-1 text-xs">
                    Funcionalidad
                  </Badge>
                  <h1 className="text-3xl font-extrabold sm:text-4xl">
                    {feature.title}
                  </h1>
                </div>
              </div>
              <p className="text-xl text-primary font-medium mb-4">
                {feature.tagline}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
            {featureImages[feature.slug] && (
              <div className="relative flex justify-center">
                <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent blur-2xl" />
                <img
                  src={featureImages[feature.slug]}
                  alt={`${feature.title} - The Black Box`}
                  className="relative rounded-2xl shadow-xl border border-border/30 w-full max-w-md object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold mb-10">Capacidades principales</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {feature.benefits.map((b) => (
              <Card key={b.title} className="border-border/50">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-3">{b.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {b.text}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="border-t border-border/50 bg-muted/30 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold mb-8">Puntos clave</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {feature.highlights.map((h) => (
              <li key={h} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm">{h}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/50 px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold mb-4">{feature.cta}</h2>
          <p className="text-muted-foreground mb-8">
            Prueba The Black Box gratis por 14 días. Sin tarjeta de crédito.
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" className="gap-2 px-8" asChild>
              <Link to="/login">
                Comenzar prueba gratuita
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/#pricing">Ver precios</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Prev / Next Navigation */}
      <section className="border-t border-border/50 px-6 py-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          {prevFeature ? (
            <Link
              to={`/features/${prevFeature.slug}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {prevFeature.title}
            </Link>
          ) : (
            <span />
          )}
          {nextFeature ? (
            <Link
              to={`/features/${nextFeature.slug}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {nextFeature.title}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <span />
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <img src="/images/logo-tbb.png" alt="The Black Box" className="h-6" />
            <span>The Black Box Cloud Platform</span>
          </div>
          <p>&copy; 2026 The Black Box. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
