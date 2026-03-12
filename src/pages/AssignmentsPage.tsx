import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Plus } from "lucide-react";

const sampleAssignments = [
  {
    source: "Salarios Administración",
    driver: "Horas Hombre (Uniforme)",
    destinations: ["Gestión de Compras", "Control de Calidad", "Despacho y Logística"],
    type: "uniform" as const,
  },
  {
    source: "Energía Eléctrica",
    driver: "kWh Consumidos (Proporcional)",
    destinations: ["Control de Calidad", "Despacho y Logística"],
    type: "extended" as const,
  },
];

const AssignmentsPage = () => {
  return (
    <AppLayout>
      <PageHeader title="Asignaciones (Drivers)" description="Ruteo de costos desde Recursos → Actividades → Objetos">
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Asignación
        </Button>
      </PageHeader>

      <div className="space-y-4">
        {sampleAssignments.map((assignment, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-4 flex-wrap">
                {/* Source */}
                <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-3 min-w-[200px]">
                  <p className="text-xs text-muted-foreground">Origen</p>
                  <p className="text-sm font-medium">{assignment.source}</p>
                </div>

                <div className="flex flex-col items-center">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground mt-1">{assignment.driver}</span>
                </div>

                {/* Destinations */}
                <div className="flex gap-2 flex-wrap flex-1">
                  {assignment.destinations.map((dest) => (
                    <div
                      key={dest}
                      className="bg-warning/10 border border-warning/20 rounded-lg px-4 py-3"
                    >
                      <p className="text-xs text-muted-foreground">Destino</p>
                      <p className="text-sm font-medium">{dest}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 text-sm text-muted-foreground text-center py-12 border border-dashed rounded-lg">
        Conecta Lovable Cloud para habilitar la lógica de cálculo y persistencia de asignaciones.
      </div>
    </AppLayout>
  );
};

export default AssignmentsPage;
