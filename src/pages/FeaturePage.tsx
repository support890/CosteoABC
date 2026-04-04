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
  Moon,
  Sun,
  CheckCircle2,
  PieChart,
  Truck,
  TrendingUp,
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
  "costeo-abc": "/images/costeo-abc-hero.png",
  "bi-express": "/images/bi-express-hero.png",
  "logistica": "/images/logistica-hero.png",
  "forecast": "/images/forecast-hero.png",
  "estrategia-bsc": "/images/bsc-hero.png",
  "seguridad-multi-tenant": "/images/seguridad-hero.png",
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
  "bi-express": {
    slug: "bi-express",
    icon: PieChart,
    title: "BI Express",
    tagline: "Inteligencia de negocio lista en minutos, no en meses.",
    description:
      "BI Express democratiza el análisis de datos para cualquier área de la organización. Sin depender del área de TI, cualquier analista puede crear dashboards con KPIs personalizados a partir de un catálogo de indicadores preconstruidos. Conecta datos, selecciona métricas y publica tu dashboard en minutos.",
    benefits: [
      {
        title: "Catálogo de KPIs",
        text: "Selecciona indicadores de un catálogo curado por industria: financieros, operativos, comerciales y de RRHH. Cada KPI incluye fórmula, frecuencia de actualización y benchmarks de referencia para que sepas si tu desempeño es competitivo.",
      },
      {
        title: "Dashboards Personalizados",
        text: "Arrastra y suelta indicadores en un canvas visual. Configura rangos semafóricos, objetivos y umbrales de alerta por KPI. El resultado es un panel de control ejecutivo que refleja exactamente las prioridades de tu negocio.",
      },
      {
        title: "Análisis de Tendencias",
        text: "Visualiza la evolución de cada indicador en el tiempo. Identifica patrones estacionales, ciclos de desempeño y desviaciones respecto a objetivos históricos. Los gráficos de tendencia se generan automáticamente con cada actualización de datos.",
      },
      {
        title: "Alertas Inteligentes",
        text: "Define umbrales por KPI y recibe alertas proactivas cuando un indicador entra en zona de riesgo. Las alertas se configuran por prioridad (Baja, Moderada, Alta) y pueden asignarse a destinatarios específicos dentro de la organización.",
      },
    ],
    highlights: [
      "Catálogo de KPIs por industria con benchmarks de referencia",
      "Dashboards configurables por área sin necesidad de TI",
      "Sistema semafórico: verde (cumple), amarillo (riesgo), rojo (crítico)",
      "Análisis de tendencias con períodos históricos comparables",
      "Alertas proactivas con prioridad y destinatarios configurables",
      "Integración nativa con datos del módulo Costeo ABC",
    ],
    cta: "Crea tu primer dashboard en menos de 10 minutos",
  },
  "logistica": {
    slug: "logistica",
    icon: Truck,
    title: "Eficiencia Logística",
    tagline: "Optimiza costos de distribución con modelos cuantitativos.",
    description:
      "El módulo de Eficiencia Logística aplica modelos de costos especializados para operaciones de distribución, transporte y cadena de suministro. Identifica ineficiencias por ruta, canal y cliente, y simula el impacto de cambios operativos antes de implementarlos — con análisis What-If y sensibilidad de parámetros.",
    benefits: [
      {
        title: "Modelos de Costo Logístico",
        text: "Construye modelos específicos para tu operación: costo por kilómetro, por entrega, por cliente o por zona. El sistema segrega costos fijos y variables, permitiendo identificar cuál es el punto de equilibrio de cada ruta o canal de distribución.",
      },
      {
        title: "Análisis What-If",
        text: "Simula escenarios antes de decidir: ¿qué pasa si elimino esta ruta? ¿si tercerizo el último tramo? ¿si cambio la frecuencia de entrega? El módulo calcula el impacto en costos y rentabilidad de cada alternativa en segundos.",
      },
      {
        title: "Análisis de Sensibilidad",
        text: "Identifica qué variables de tu modelo tienen mayor impacto en el costo final. El análisis de sensibilidad muestra cómo cambia el resultado ante variaciones en combustible, tarifas de flete, volumen o densidad de la ruta.",
      },
      {
        title: "Resultados Desagregados",
        text: "Visualiza costos desagregados por ruta, canal, cliente, zona geográfica y tipo de producto. Identifica qué segmentos son rentables y cuáles están subsidiando operaciones deficitarias.",
      },
    ],
    highlights: [
      "Modelos de costo por ruta, canal, cliente y zona geográfica",
      "Análisis What-If con múltiples escenarios simultáneos",
      "Sensibilidad de parámetros para decisiones de pricing logístico",
      "Segregación automática de costos fijos y variables",
      "Comparación de períodos para identificar tendencias de eficiencia",
      "Exportación de resultados para negociación con transportistas",
    ],
    cta: "Descubre cuánto cuesta realmente cada entrega",
  },
  "forecast": {
    slug: "forecast",
    icon: TrendingUp,
    title: "Forecast",
    tagline: "Proyecta el futuro con modelos, no con intuición.",
    description:
      "El módulo de Forecast aplica métodos cuantitativos de pronóstico para proyectar ingresos, demanda y costos. Combina series de tiempo históricas con variables de negocio para generar proyecciones ajustadas al contexto real de tu empresa — no fórmulas genéricas de Excel.",
    benefits: [
      {
        title: "Múltiples Métodos de Pronóstico",
        text: "Selecciona el método más adecuado para tu tipo de dato: promedio móvil, suavizamiento exponencial, regresión lineal o estacionalidad Holt-Winters. El sistema sugiere el mejor método basado en el patrón histórico de tus datos.",
      },
      {
        title: "Comparación de Escenarios",
        text: "Define escenarios optimista, base y pesimista para cada proyección. Compara visualmente cómo cambian los resultados según los supuestos de cada escenario y comunica el rango de incertidumbre a la dirección.",
      },
      {
        title: "Dashboard de Proyecciones",
        text: "Visualiza tus proyecciones vs. resultados reales en tiempo real. El dashboard muestra el avance del período actual, la desviación respecto al forecast y las alertas cuando el negocio se aleja significativamente de lo proyectado.",
      },
      {
        title: "Alineación con Estrategia",
        text: "Conecta las proyecciones del Forecast con los objetivos del módulo BSC. Cuando el forecast detecta un desvío respecto a los KPIs estratégicos, el equipo directivo recibe contexto cuantitativo para ajustar el plan.",
      },
    ],
    highlights: [
      "Métodos: promedio móvil, suavizamiento exponencial, Holt-Winters",
      "Escenarios optimista / base / pesimista con intervalos de confianza",
      "Dashboard de seguimiento forecast vs. real por período",
      "Alertas de desvío significativo respecto a proyecciones",
      "Integración con datos históricos de Costeo ABC",
      "Exportación de proyecciones para presupuestación y reporting",
    ],
    cta: "Planifica con proyecciones que reflejan la realidad",
  },
  "estrategia-bsc": {
    slug: "estrategia-bsc",
    icon: Target,
    title: "Estrategia BSC",
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
          <Link to="/">
            <img
              src={theme === "dark" ? "/images/logo-white.png" : "/images/logo-bb.png"}
              alt="The Black Box"
              className="h-12"
            />
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
            <Button asChild size="sm">
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
                  className="relative rounded-2xl shadow-xl border border-border/30 w-full max-w-6xl object-cover"
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
            <img
              src={theme === "dark" ? "/images/logo-white.png" : "/images/logo-bb.png"}
              alt="The Black Box"
              className="h-7"
            />
          </div>
          <p>&copy; 2026 The Black Box. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
