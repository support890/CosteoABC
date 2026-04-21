import { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Building2,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Shield,
  Ban,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSuperAdmin } from "@/hooks/use-superadmin";
import { supabase } from "@/lib/supabase";

interface ClientRow {
  tenant_id: string;
  tenant_name: string;
  plan: string;
  is_active: boolean;
  tenant_created_at: string;
  owner_id: string;
  owner_name: string | null;
  owner_email: string | null;
  trial_ends_at: string | null;
  member_count: number;
}

function trialStatus(trialEndsAt: string | null): {
  label: string;
  daysLeft: number;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  if (!trialEndsAt) return { label: "Sin trial", daysLeft: 0, variant: "secondary" };
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return { label: "Vencido", daysLeft: 0, variant: "destructive" };
  if (days <= 3) return { label: `${days}d restantes`, daysLeft: days, variant: "destructive" };
  if (days <= 7) return { label: `${days}d restantes`, daysLeft: days, variant: "outline" };
  return { label: `${days}d restantes`, daysLeft: days, variant: "default" };
}

function planLabel(plan: string) {
  const map: Record<string, string> = {
    starter: "Starter",
    pro: "Pro",
    enterprise: "Enterprise",
  };
  return map[plan] ?? plan;
}

export default function SuperAdminPage() {
  const { isSuperAdmin, loading: saLoading } = useSuperAdmin();
  const { toast } = useToast();

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [extendTarget, setExtendTarget] = useState<ClientRow | null>(null);
  const [extendDays, setExtendDays] = useState("14");
  const [extending, setExtending] = useState(false);
  const [planTarget, setPlanTarget] = useState<ClientRow | null>(null);
  const [newPlan, setNewPlan] = useState("starter");
  const [updatingPlan, setUpdatingPlan] = useState(false);
  const [togglingActive, setTogglingActive] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    // Join tenants → tenant_members (admin) → profiles
    const { data, error } = await supabase
      .from("tenant_members")
      .select(`
        role,
        tenants!inner(id, name, plan, is_active, created_at),
        profiles!inner(id, full_name, email, trial_ends_at)
      `)
      .eq("role", "admin");

    if (error) {
      toast({ variant: "destructive", title: "Error al cargar clientes", description: error.message });
      setLoading(false);
      return;
    }

    // Count members per tenant
    const { data: counts } = await supabase
      .from("tenant_members")
      .select("tenant_id");

    const countMap: Record<string, number> = {};
    counts?.forEach((r: { tenant_id: string }) => {
      countMap[r.tenant_id] = (countMap[r.tenant_id] ?? 0) + 1;
    });

    const rows: ClientRow[] = (data ?? []).map((r: any) => ({
      tenant_id: r.tenants.id,
      tenant_name: r.tenants.name,
      plan: r.tenants.plan,
      is_active: r.tenants.is_active ?? true,
      tenant_created_at: r.tenants.created_at,
      owner_id: r.profiles.id,
      owner_name: r.profiles.full_name,
      owner_email: r.profiles.email,
      trial_ends_at: r.profiles.trial_ends_at,
      member_count: countMap[r.tenants.id] ?? 1,
    }));

    setClients(rows);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (isSuperAdmin) fetchClients();
  }, [isSuperAdmin, fetchClients]);

  const handleExtendTrial = async () => {
    if (!extendTarget) return;
    setExtending(true);
    const { error } = await supabase.rpc("extend_trial", {
      p_user_id: extendTarget.owner_id,
      p_days: parseInt(extendDays),
    });
    setExtending(false);
    if (error) {
      toast({ variant: "destructive", title: "Error al extender trial", description: error.message });
    } else {
      toast({ title: "Trial extendido", description: `Se extendieron ${extendDays} días para ${extendTarget.tenant_name}.` });
      setExtendTarget(null);
      fetchClients();
    }
  };

  const handleToggleActive = async (client: ClientRow) => {
    setTogglingActive(client.tenant_id);
    const newActive = !client.is_active;
    const { error } = await supabase
      .from("tenants")
      .update({ is_active: newActive })
      .eq("id", client.tenant_id);
    setTogglingActive(null);
    if (error) {
      toast({ variant: "destructive", title: "Error al actualizar estado", description: error.message });
    } else {
      toast({
        title: newActive ? "Cuenta reactivada" : "Cuenta desactivada",
        description: `${client.tenant_name} ha sido ${newActive ? "reactivada" : "desactivada"}.`,
      });
      fetchClients();
    }
  };

  const handleChangePlan = async () => {
    if (!planTarget) return;
    setUpdatingPlan(true);
    const { error } = await supabase
      .from("tenants")
      .update({ plan: newPlan })
      .eq("id", planTarget.tenant_id);
    setUpdatingPlan(false);
    if (error) {
      toast({ variant: "destructive", title: "Error al cambiar plan", description: error.message });
    } else {
      toast({ title: "Plan actualizado", description: `${planTarget.tenant_name} ahora tiene plan ${planLabel(newPlan)}.` });
      setPlanTarget(null);
      fetchClients();
    }
  };

  if (saLoading) return null;
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;

  const total = clients.length;
  const active = clients.filter((c) => {
    const s = trialStatus(c.trial_ends_at);
    return s.daysLeft > 0;
  }).length;
  const expired = clients.filter((c) => {
    const s = trialStatus(c.trial_ends_at);
    return c.trial_ends_at && s.daysLeft <= 0;
  }).length;

  return (
    <AppLayout>
      <PageHeader
        title="Superadmin — Clientes"
        description="Vista global de todos los clientes registrados en la plataforma."
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Total clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" /> Trial activo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Trial vencido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{expired}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" /> Lista de clientes
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchClients} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estado</TableHead>
              <TableHead>Cliente</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Trial</TableHead>
                <TableHead className="text-center">Usuarios</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    Cargando clientes...
                  </TableCell>
                </TableRow>
              ) : clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    No hay clientes registrados.
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => {
                  const status = trialStatus(client.trial_ends_at);
                  return (
                    <TableRow key={client.tenant_id} className={!client.is_active ? "opacity-60" : ""}>
                      <TableCell>
                        {client.is_active ? (
                          <Badge variant="default" className="bg-primary/20 text-primary border-primary/40">Activo</Badge>
                        ) : (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <Ban className="h-3 w-3" /> Desactivado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{client.tenant_name}</TableCell>
                      <TableCell>
                        <div className="text-sm">{client.owner_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{client.owner_email ?? "—"}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{planLabel(client.plan)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
                          {status.daysLeft <= 0 && client.trial_ends_at ? (
                            <AlertTriangle className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="flex items-center justify-center gap-1 text-sm">
                          <Users className="h-3 w-3" /> {client.member_count}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(client.tenant_created_at).toLocaleDateString("es-CL")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setExtendTarget(client);
                              setExtendDays("14");
                            }}
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            Extender trial
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPlanTarget(client);
                              setNewPlan(client.plan);
                            }}
                          >
                            Cambiar plan
                          </Button>
                          <Button
                            variant={client.is_active ? "destructive" : "default"}
                            size="sm"
                            disabled={togglingActive === client.tenant_id}
                            onClick={() => handleToggleActive(client)}
                          >
                            {client.is_active ? (
                              <><ToggleLeft className="h-3 w-3 mr-1" /> Desactivar</>
                            ) : (
                              <><ToggleRight className="h-3 w-3 mr-1" /> Reactivar</>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Extend Trial Dialog */}
      <Dialog open={!!extendTarget} onOpenChange={(o) => !o && setExtendTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Extender trial</DialogTitle>
            <DialogDescription>
              Extiende el período de prueba para <strong>{extendTarget?.tenant_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select value={extendDays} onValueChange={setExtendDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 días</SelectItem>
                <SelectItem value="14">14 días</SelectItem>
                <SelectItem value="30">30 días</SelectItem>
                <SelectItem value="60">60 días</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendTarget(null)}>Cancelar</Button>
            <Button onClick={handleExtendTrial} disabled={extending}>
              {extending ? "Extendiendo..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={!!planTarget} onOpenChange={(o) => !o && setPlanTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cambiar plan</DialogTitle>
            <DialogDescription>
              Cambia el plan de <strong>{planTarget?.tenant_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select value={newPlan} onValueChange={setNewPlan}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanTarget(null)}>Cancelar</Button>
            <Button onClick={handleChangePlan} disabled={updatingPlan}>
              {updatingPlan ? "Guardando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
