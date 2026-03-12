import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Building2, Shield } from "lucide-react";

const AdminPage = () => {
  return (
    <AppLayout>
      <PageHeader title="Administración" description="Gestión de usuarios, tenants y perfiles">
        <Button>Nuevo Usuario</Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-sm">Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">12</p>
            <p className="text-xs text-muted-foreground mt-1">3 administradores, 5 analistas, 4 responsables</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center gap-3">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-sm">Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">3</p>
            <p className="text-xs text-muted-foreground mt-1">PyMEs conectadas al sistema</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-sm">Roles Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">3</p>
            <p className="text-xs text-muted-foreground mt-1">Admin, Analyst, KPI Owner</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 text-sm text-muted-foreground text-center py-12 border border-dashed rounded-lg">
        Conecta Lovable Cloud para habilitar la gestión completa de usuarios y RBAC.
      </div>
    </AppLayout>
  );
};

export default AdminPage;
