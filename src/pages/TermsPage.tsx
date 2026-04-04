import { Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun, ArrowLeft } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export default function TermsPage() {
  const { theme, toggleTheme } = useTheme();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
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
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
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

      <div className="mx-auto max-w-3xl px-6 pt-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>
      </div>

      <article className="mx-auto max-w-3xl px-6 py-16 prose prose-sm dark:prose-invert prose-headings:font-bold prose-p:text-muted-foreground prose-li:text-muted-foreground">
        <h1 className="text-3xl font-extrabold text-foreground">
          Términos de Servicio
        </h1>
        <p className="text-xs text-muted-foreground">
          Última actualización: 12 de marzo de 2026
        </p>

        <h2 className="text-xl text-foreground mt-8">
          1. Aceptación de los Términos
        </h2>
        <p>
          Al acceder y utilizar la plataforma The Black Box ("el Servicio"), usted
          acepta estar sujeto a estos Términos de Servicio. Si no está de
          acuerdo con alguna parte de estos términos, no podrá acceder al
          Servicio.
        </p>

        <h2 className="text-xl text-foreground mt-8">
          2. Descripción del Servicio
        </h2>
        <p>
          The Black Box es una plataforma SaaS (Software as a Service) de gestión
          de costos basada en la metodología Activity Based Costing (ABC) y
          Balanced Scorecard (BSC). El Servicio permite a las empresas gestionar
          modelos de costos, indicadores de desempeño y reportes analíticos en
          la nube.
        </p>

        <h2 className="text-xl text-foreground mt-8">3. Cuentas de Usuario</h2>
        <ul>
          <li>
            Usted es responsable de mantener la confidencialidad de su cuenta y
            contraseña.
          </li>
          <li>
            Debe proporcionar información precisa, completa y actualizada al
            momento del registro.
          </li>
          <li>
            Debe notificar inmediatamente cualquier uso no autorizado de su
            cuenta.
          </li>
          <li>
            No puede compartir credenciales de acceso entre usuarios no
            autorizados.
          </li>
        </ul>

        <h2 className="text-xl text-foreground mt-8">
          4. Planes y Facturación
        </h2>
        <ul>
          <li>
            Los precios están sujetos a cambios con 30 días de aviso previo.
          </li>
          <li>
            La facturación se realiza de forma mensual o anual según el plan
            seleccionado.
          </li>
          <li>
            El período de prueba gratuito dura 14 días y no requiere tarjeta de
            crédito.
          </li>
          <li>
            Al finalizar la prueba, debe seleccionar un plan de pago para
            continuar usando el Servicio.
          </li>
        </ul>

        <h2 className="text-xl text-foreground mt-8">5. Uso Aceptable</h2>
        <p>Usted se compromete a no:</p>
        <ul>
          <li>Utilizar el Servicio para fines ilegales o no autorizados.</li>
          <li>Intentar acceder a datos de otros inquilinos (tenants).</li>
          <li>
            Realizar ingeniería inversa, descompilar o desensamblar el Servicio.
          </li>
          <li>Transmitir virus, malware o código malicioso.</li>
          <li>Sobrecargar intencionalmente la infraestructura del Servicio.</li>
        </ul>

        <h2 className="text-xl text-foreground mt-8">
          6. Propiedad de los Datos
        </h2>
        <p>
          Usted retiene todos los derechos de propiedad sobre los datos que
          carga en la plataforma. The Black Box no accederá, usará ni compartirá
          sus datos excepto según sea necesario para proporcionar el Servicio o
          según lo requiera la ley.
        </p>

        <h2 className="text-xl text-foreground mt-8">
          7. Disponibilidad del Servicio
        </h2>
        <p>
          Nos esforzamos por mantener una disponibilidad del 99.9% para los
          planes Enterprise con SLA. No garantizamos disponibilidad
          ininterrumpida para planes Starter y Pro, aunque hacemos nuestro mejor
          esfuerzo para minimizar el tiempo de inactividad.
        </p>

        <h2 className="text-xl text-foreground mt-8">
          8. Limitación de Responsabilidad
        </h2>
        <p>
          En ningún caso The Black Box será responsable por daños indirectos,
          incidentales, especiales o consecuentes que resulten del uso o la
          imposibilidad de uso del Servicio. La responsabilidad máxima se
          limitará al monto pagado por el Servicio en los últimos 12 meses.
        </p>

        <h2 className="text-xl text-foreground mt-8">9. Terminación</h2>
        <p>
          Podemos suspender o terminar su acceso al Servicio inmediatamente, sin
          previo aviso, por incumplimiento de estos Términos. Tras la
          terminación, su derecho de uso del Servicio cesará inmediatamente. Los
          datos serán retenidos por 30 días para permitir la exportación.
        </p>

        <h2 className="text-xl text-foreground mt-8">10. Contacto</h2>
        <p>
          Para preguntas sobre estos Términos, contáctenos en{" "}
          <Link to="/contact" className="text-primary hover:underline">
            nuestra página de contacto
          </Link>{" "}
          o escríbanos a legal@theblackbox.com.
        </p>
      </article>

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
