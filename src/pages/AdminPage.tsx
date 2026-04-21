import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Building2, Shield, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/use-tenant";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanLimits } from "@/hooks/use-plan-limits";
import { useTrial } from "@/hooks/use-trial";
import { UsageDialog } from "@/components/UsageDialog";
import { supabase } from "@/lib/supabase";

interface TenantMember {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles: {
    id: string;
    full_name: string | null;
    company: string | null;
    email: string | null;
  } | null;
}

const roleLabels: Record<string, string> = {
  admin: "Admin",
  member: "Usuario invitado",
  // legacy — keep labels for existing rows
  analyst: "Usuario invitado",
  kpi_owner: "Usuario invitado",
  consultant: "Usuario invitado",
};

const AdminPage = () => {
  const { toast } = useToast();
  const { tenant, userRole } = useTenant();
  const { user: currentUser } = useAuth();
  const { canCreateUser } = usePlanLimits();
  const { trialEndsAt } = useTrial();
  const qc = useQueryClient();
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // New user form
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("analyst");

  // Edit form
  const [editMember, setEditMember] = useState<TenantMember | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");

  useEffect(() => {
    if (tenant) fetchMembers();
  }, [tenant]);

  async function fetchMembers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("tenant_members")
      .select("id, user_id, role, created_at, profiles(id, full_name, company, email)")
      .eq("tenant_id", tenant!.id);

    if (error) {
      console.error("Error fetching members:", error);
    } else {
      setMembers((data as unknown as TenantMember[]) || []);
    }
    setLoading(false);
  }

  async function handleCreateUser() {
    if (!newEmail || !newPassword || !tenant) return;

    setSaving(true);
    try {
      const {
        data: { session: adminSession },
      } = await supabase.auth.getSession();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: {
          data: {
            full_name: newName,
            is_invited: true,
            ...(trialEndsAt ? { trial_ends_at: trialEndsAt.toISOString() } : {}),
          },
        },
      });

      if (authError) {
        toast({
          title: "Error",
          description: authError.message,
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      if (!authData.user) {
        toast({
          title: "Error",
          description: "No se pudo crear el usuario",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      if (adminSession) {
        await supabase.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token,
        });
      }

      const { error: memberError } = await supabase.rpc("add_tenant_member", {
        p_tenant_id: tenant.id,
        p_user_id: authData.user.id,
        p_role: newRole,
        p_full_name: newName || null,
      });

      if (memberError) {
        toast({
          title: "Error",
          description: memberError.message,
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      toast({
        title: "Usuario creado",
        description: `${newEmail} agregado como ${roleLabels[newRole]}`,
      });
      setDialogOpen(false);
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      setNewRole("analyst");
      fetchMembers();
      qc.invalidateQueries({ queryKey: ["plan-limits-users", tenant?.id] });
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Error inesperado",
        variant: "destructive",
      });
    }
    setSaving(false);
  }

  function openEditDialog(member: TenantMember) {
    setEditMember(member);
    setEditName(member.profiles?.full_name || "");
    setEditRole(member.role);
    setEditDialogOpen(true);
  }

  async function handleEditMember() {
    if (!editMember || !tenant) return;

    setSaving(true);
    try {
      const { error } = await supabase.rpc("update_member_profile", {
        p_user_id: editMember.user_id,
        p_full_name: editName,
        p_role: editRole !== editMember.role ? editRole : null,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      toast({
        title: "Actualizado",
        description: `${editName || "Usuario"} fue actualizado`,
      });
      setEditDialogOpen(false);
      setEditMember(null);
      fetchMembers();
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Error inesperado",
        variant: "destructive",
      });
    }
    setSaving(false);
  }

  async function handleDeleteMember(memberId: string, memberName: string) {
    const { error } = await supabase
      .from("tenant_members")
      .delete()
      .eq("id", memberId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Eliminado",
        description: `${memberName} fue removido del tenant`,
      });
      fetchMembers();
      qc.invalidateQueries({ queryKey: ["plan-limits-users", tenant?.id] });
    }
  }

  if (userRole !== "admin" && !loading) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AppLayout>
      <PageHeader
        title="Administración"
        description="Gestión de usuarios y roles del tenant"
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <Button onClick={() => {
            if (!canCreateUser) { setLimitDialogOpen(true); return; }
            setDialogOpen(true);
          }}>
            Nuevo Usuario
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              <DialogDescription>
                Crea una cuenta y agrégala al tenant actual.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Juan Pérez"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Input value="Usuario invitado" disabled />
                <p className="text-xs text-muted-foreground">
                  Los usuarios invitados no tienen permisos de administración.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateUser}
                disabled={saving || !newEmail || !newPassword}
              >
                {saving ? "Creando..." : "Crear Usuario"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Miembro</DialogTitle>
            <DialogDescription>
              Modifica el nombre y rol del miembro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre completo</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nombre del usuario"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Rol</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="analyst">Usuario invitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditMember} disabled={saving}>
              {saving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="mt-6 border-border/50">
        <CardHeader>
          <CardTitle className="text-sm">Miembros del Tenant</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay miembros registrados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                      Nombre
                    </th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                      Rol
                    </th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                      Estado
                    </th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                      Desde
                    </th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-b border-border/30">
                      <td className="py-2 px-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {m.profiles?.full_name || "Sin nombre"}
                          </span>
                          <span className="text-[11px] text-muted-foreground mt-0.5">
                            {m.profiles?.email || "Sin email registrado"}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {roleLabels[m.role] || m.role}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                          Activo
                        </span>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {new Date(m.created_at).toLocaleDateString("es-CL")}
                      </td>
                      <td className="py-2 px-3 text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(m)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {m.user_id !== currentUser?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setConfirmDelete({
                                id: m.id,
                                name: m.profiles?.full_name || "Usuario",
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar a <span className="font-semibold text-foreground">{confirmDelete?.name}</span> del equipo. Esta acción cerrará su sesión inmediatamente y no podrá acceder hasta que sea invitado nuevamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) {
                  handleDeleteMember(confirmDelete.id, confirmDelete.name);
                  setConfirmDelete(null);
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UsageDialog open={limitDialogOpen} onOpenChange={setLimitDialogOpen} showUpgrade />
    </AppLayout>
  );
};

export default AdminPage;
