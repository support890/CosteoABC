import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, User, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/hooks/use-tenant";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
  const { user } = useAuth();
  const { tenant, userRole } = useTenant();
  const { toast } = useToast();

  const isAdmin = userRole === "admin";

  const [fullName, setFullName] = useState(
    user?.user_metadata?.full_name ?? ""
  );
  // Admins edit their own metadata company; invited users see the tenant name (read-only)
  const [company, setCompany] = useState(
    isAdmin ? (user?.user_metadata?.company ?? "") : (tenant?.name ?? "")
  );
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName, company },
    });
    setSavingProfile(false);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Perfil actualizado", description: "Los cambios se guardaron correctamente." });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Error", description: "Las contraseñas no coinciden." });
      return;
    }
    if (newPassword.length < 8) {
      toast({ variant: "destructive", title: "Error", description: "La contraseña debe tener al menos 8 caracteres." });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Contraseña actualizada", description: "Tu contraseña fue cambiada correctamente." });
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Editar perfil"
        description="Actualiza tu información personal y contraseña."
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
        {/* Profile info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Información personal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full-name">Nombre completo</Label>
                <Input
                  id="full-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Juan Pérez"
                  disabled={savingProfile}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Empresa</Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Mi Empresa S.A."
                  disabled={savingProfile || !isAdmin}
                />
                {!isAdmin && (
                  <p className="text-xs text-muted-foreground">
                    Solo el administrador puede modificar el nombre de la empresa.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Correo electrónico</Label>
                <Input value={user?.email ?? ""} disabled />
                <p className="text-xs text-muted-foreground">
                  El correo no puede modificarse desde aquí.
                </p>
              </div>
              <Button type="submit" disabled={savingProfile}>
                {savingProfile && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Guardar cambios
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password change */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4" />
              Cambiar contraseña
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nueva contraseña</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                  disabled={savingPassword}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  disabled={savingPassword}
                />
              </div>
              <Button type="submit" disabled={savingPassword || !newPassword}>
                {savingPassword && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Cambiar contraseña
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
