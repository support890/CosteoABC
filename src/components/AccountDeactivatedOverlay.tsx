import { useTenantContext } from "@/contexts/TenantContext";
import { useSuperAdmin } from "@/hooks/use-superadmin";
import { Ban } from "lucide-react";

const WHATSAPP_LINK = "https://wa.link/33h5va";

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 fill-current"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function AccountDeactivatedOverlay() {
  const { tenant, loading } = useTenantContext();
  const { isSuperAdmin } = useSuperAdmin();

  // Superadmins never get blocked, and don't wait for tenant
  if (loading || isSuperAdmin) return null;
  if (!tenant || tenant.is_active !== false) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <Ban className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="mb-2 text-2xl font-bold">Cuenta desactivada</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Tu cuenta ha sido desactivada. Para reactivarla o conocer más
          información, contáctate con nuestro equipo de ventas.
        </p>
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-8 py-3 text-sm font-semibold text-white shadow transition-opacity hover:opacity-90"
        >
          <WhatsAppIcon />
          Contactar por WhatsApp
        </a>
        <p className="mt-4 text-xs text-muted-foreground">
          También puedes escribirnos a{" "}
          <a
            href="mailto:support@operationalservices.org"
            className="text-primary hover:underline"
          >
            support@operationalservices.org
          </a>
        </p>
      </div>
    </div>
  );
}
