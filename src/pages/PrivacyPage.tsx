import { Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun, ArrowLeft } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export default function PrivacyPage() {
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
          Política de Privacidad
        </h1>
        <p className="text-xs text-muted-foreground">
          Última actualización: 12 de marzo de 2026
        </p>

        <h2 className="text-xl text-foreground mt-8">
          1. Información que Recopilamos
        </h2>
        <p>Recopilamos información que usted nos proporciona directamente:</p>
        <ul>
          <li>
            <strong>Datos de cuenta:</strong> nombre, correo electrónico,
            empresa, contraseña (cifrada).
          </li>
          <li>
            <strong>Datos de facturación:</strong> procesados por proveedores de
            pago certificados PCI-DSS. No almacenamos datos de tarjetas.
          </li>
          <li>
            <strong>Datos de uso:</strong> información contable, modelos de
            costos, KPIs y configuraciones que usted carga en la plataforma.
          </li>
          <li>
            <strong>Datos técnicos:</strong> dirección IP, tipo de navegador,
            sistema operativo y telemetría de rendimiento.
          </li>
        </ul>

        <h2 className="text-xl text-foreground mt-8">
          2. Cómo Usamos su Información
        </h2>
        <ul>
          <li>Proporcionar, mantener y mejorar el Servicio.</li>
          <li>Procesar transacciones y enviar notificaciones relacionadas.</li>
          <li>
            Enviar comunicaciones técnicas, actualizaciones y alertas de
            seguridad.
          </li>
          <li>Monitorear el rendimiento y la estabilidad de la plataforma.</li>
          <li>
            Detectar y prevenir actividades fraudulentas o no autorizadas.
          </li>
        </ul>

        <h2 className="text-xl text-foreground mt-8">
          3. Aislamiento de Datos (Multi-Tenancy)
        </h2>
        <p>
          The Black Box opera bajo una arquitectura de aislamiento celular. Los
          datos de cada empresa (tenant) están lógica y/o físicamente separados
          de los demás inquilinos:
        </p>
        <ul>
          <li>
            <strong>Plan Starter y Pro:</strong> aislamiento lógico con
            Row-Level Security y namespaces dedicados.
          </li>
          <li>
            <strong>Plan Enterprise:</strong> aislamiento físico mediante base
            de datos dedicada en VPC independiente.
          </li>
        </ul>
        <p>
          En ningún caso un inquilino puede acceder, visualizar o modificar
          datos pertenecientes a otro inquilino.
        </p>

        <h2 className="text-xl text-foreground mt-8">
          4. Compartición de Datos
        </h2>
        <p>
          No vendemos, alquilamos ni compartimos sus datos personales con
          terceros, excepto:
        </p>
        <ul>
          <li>Con su consentimiento explícito.</li>
          <li>
            Con proveedores de servicios que nos ayudan a operar la plataforma
            (hosting, pagos), bajo acuerdos de confidencialidad.
          </li>
          <li>Cuando lo requiera la ley o una orden judicial.</li>
        </ul>

        <h2 className="text-xl text-foreground mt-8">
          5. Seguridad de los Datos
        </h2>
        <ul>
          <li>Cifrado en tránsito (TLS 1.3) y en reposo (AES-256).</li>
          <li>
            Comunicaciones entre servicios protegidas con mutual TLS (mTLS).
          </li>
          <li>Backups automáticos con retención configurable.</li>
          <li>Autenticación basada en JWT con contexto de tenant.</li>
          <li>Auditoría completa de accesos y operaciones.</li>
        </ul>

        <h2 className="text-xl text-foreground mt-8">6. Retención de Datos</h2>
        <p>
          Retenemos sus datos mientras su cuenta esté activa. Tras la
          cancelación o terminación, los datos se mantienen por 30 días para
          permitir la exportación, después de lo cual se eliminan
          permanentemente de nuestros sistemas, incluyendo backups, en un plazo
          máximo de 90 días.
        </p>

        <h2 className="text-xl text-foreground mt-8">7. Sus Derechos</h2>
        <p>Usted tiene derecho a:</p>
        <ul>
          <li>Acceder a sus datos personales almacenados en la plataforma.</li>
          <li>Corregir datos inexactos o incompletos.</li>
          <li>Solicitar la eliminación de sus datos ("derecho al olvido").</li>
          <li>Exportar sus datos en formatos estándar (CSV, Excel).</li>
          <li>Revocar el consentimiento para comunicaciones de marketing.</li>
        </ul>

        <h2 className="text-xl text-foreground mt-8">8. Cookies</h2>
        <p>
          Utilizamos cookies esenciales para el funcionamiento del Servicio
          (autenticación, preferencias de sesión). No utilizamos cookies de
          seguimiento ni publicidad de terceros.
        </p>

        <h2 className="text-xl text-foreground mt-8">
          9. Cambios a esta Política
        </h2>
        <p>
          Nos reservamos el derecho de modificar esta política. Los cambios
          significativos serán notificados por email con al menos 30 días de
          anticipación. El uso continuado del Servicio tras la notificación
          constituye aceptación de los cambios.
        </p>

        <h2 className="text-xl text-foreground mt-8">10. Contacto</h2>
        <p>
          Para ejercer sus derechos o consultas sobre privacidad, contáctenos en{" "}
          <Link to="/contact" className="text-primary hover:underline">
            nuestra página de contacto
          </Link>{" "}
          o escríbanos a privacidad@theblackbox.com.
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
