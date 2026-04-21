import { useState } from "react";
import { useTrial } from "@/hooks/use-trial";
import { useSuperAdmin } from "@/hooks/use-superadmin";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle } from "lucide-react";

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

export function TrialBadge() {
  const { hasTrial, isExpired, daysLeft } = useTrial();
  const { isSuperAdmin } = useSuperAdmin();
  const [open, setOpen] = useState(false);

  if (!hasTrial || isSuperAdmin) return null;

  const badgeColor = isExpired
    ? "bg-destructive/20 text-destructive border-destructive/40 hover:bg-destructive/30"
    : daysLeft <= 3
      ? "bg-orange-500/20 text-orange-400 border-orange-500/40 hover:bg-orange-500/30"
      : daysLeft <= 7
        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40 hover:bg-yellow-500/30"
        : "bg-primary/20 text-primary border-primary/40 hover:bg-primary/30";

  const label = isExpired
    ? "Trial vencido"
    : daysLeft === 1
      ? "1 día restante"
      : `${daysLeft} días restantes`;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${badgeColor}`}
      >
        {isExpired ? (
          <AlertTriangle className="h-3 w-3" />
        ) : (
          <Clock className="h-3 w-3" />
        )}
        {label}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader className="items-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              {isExpired ? (
                <AlertTriangle className="h-6 w-6 text-destructive" />
              ) : (
                <Clock className="h-6 w-6 text-primary" />
              )}
            </div>
            <DialogTitle className="text-xl">
              {isExpired ? "Tu prueba ha vencido" : `Te quedan ${daysLeft} día${daysLeft !== 1 ? "s" : ""} de prueba`}
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground mt-2">
              {isExpired
                ? "Tu período de prueba gratuita ha finalizado. Para continuar usando la plataforma, contáctanos y te preparamos un plan a tu medida."
                : "Para continuar usando la plataforma sin interrupciones, contáctanos y te ayudamos a elegir el plan ideal para ti."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-3">
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-6 py-3 text-sm font-semibold text-white shadow transition-opacity hover:opacity-90"
            >
              <WhatsAppIcon />
              Contactar por WhatsApp
            </a>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
