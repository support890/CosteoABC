import { Users, Database, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { usePlanLimits } from "@/hooks/use-plan-limits";

const WHATSAPP_LINK = "https://wa.link/33h5va";

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

interface UsageRowProps {
  icon: React.ReactNode;
  label: string;
  used: number;
  limit: number | null;
}

function UsageRow({ icon, label, used, limit }: UsageRowProps) {
  const unlimited = limit === null;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / limit!) * 100));
  const nearLimit = !unlimited && pct >= 80;
  const atLimit = !unlimited && used >= limit!;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium">
          {icon}
          {label}
        </span>
        <span
          className={
            atLimit
              ? "text-destructive font-semibold"
              : nearLimit
              ? "text-orange-400 font-semibold"
              : "text-muted-foreground"
          }
        >
          {used} / {unlimited ? "∞" : limit}
        </span>
      </div>
      {!unlimited && (
        <Progress
          value={pct}
          className={`h-2 ${atLimit ? "[&>div]:bg-destructive" : nearLimit ? "[&>div]:bg-orange-400" : ""}`}
        />
      )}
      {unlimited && (
        <p className="text-xs text-muted-foreground">Sin límite en tu plan actual</p>
      )}
    </div>
  );
}

interface UsageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Muestra el CTA de upgrade cuando se alcanzó un límite */
  showUpgrade?: boolean;
}

export function UsageDialog({ open, onOpenChange, showUpgrade = false }: UsageDialogProps) {
  const { limits, usage, plan, isLoading } = usePlanLimits();

  const planLabel =
    plan === "pro" ? "Pro" : plan === "enterprise" ? "Enterprise" : "Starter";

  const atAnyLimit =
    (limits.models !== null && usage.models >= limits.models) ||
    (limits.users !== null && usage.users >= limits.users);

  const displayUpgrade = showUpgrade || atAnyLimit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Consumo del plan
            <Badge variant="secondary" className="ml-auto text-xs">
              {planLabel}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Cargando...
          </div>
        ) : (
          <>
            <div className="space-y-5 py-2">
              <UsageRow
                icon={<Database className="h-4 w-4 text-muted-foreground" />}
                label="Modelos"
                used={usage.models}
                limit={limits.models}
              />
              <UsageRow
                icon={<Users className="h-4 w-4 text-muted-foreground" />}
                label="Usuarios"
                used={usage.users}
                limit={limits.users}
              />
            </div>

            {displayUpgrade && (
              <>
                <Separator />
                <div className="space-y-3 pt-1">
                  <p className="text-sm text-muted-foreground text-center">
                    Alcanzaste el límite de tu plan. Actualiza a <span className="font-semibold text-foreground">Pro</span> para tener modelos y usuarios ilimitados.
                  </p>
                  <a
                    href={WHATSAPP_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow transition-opacity hover:opacity-90"
                  >
                    <WhatsAppIcon />
                    Contactar ventas por WhatsApp
                  </a>
                </div>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
