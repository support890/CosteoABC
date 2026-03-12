import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload } from "lucide-react";

const resources = [
  { code: "R-001", name: "Salarios Administración", amount: 45000 },
  { code: "R-002", name: "Alquiler Oficinas", amount: 12000 },
  { code: "R-003", name: "Energía Eléctrica", amount: 3500 },
  { code: "R-004", name: "Depreciación Equipos", amount: 8200 },
];

const activities = [
  { code: "A-001", name: "Gestión de Compras", amount: 0 },
  { code: "A-002", name: "Control de Calidad", amount: 0 },
  { code: "A-003", name: "Despacho y Logística", amount: 0 },
];

const objects = [
  { code: "O-001", name: "Producto Alpha", amount: 0 },
  { code: "O-002", name: "Producto Beta", amount: 0 },
  { code: "O-003", name: "Cliente Premium", amount: 0 },
];

function DictionaryTable({ items, type }: { items: typeof resources; type: string }) {
  const typeColors: Record<string, string> = {
    resource: "bg-primary/10 text-primary",
    activity: "bg-warning/10 text-warning",
    object: "bg-success/10 text-success",
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-24">Código</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead className="text-right">Monto ($)</TableHead>
          <TableHead className="w-24">Tipo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.code}>
            <TableCell className="font-mono text-xs">{item.code}</TableCell>
            <TableCell className="font-medium">{item.name}</TableCell>
            <TableCell className="text-right font-mono">
              {item.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </TableCell>
            <TableCell>
              <Badge variant="secondary" className={typeColors[type]}>
                {type}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const DictionariesPage = () => {
  return (
    <AppLayout>
      <PageHeader title="Diccionarios ABC" description="Gestión de Recursos, Actividades y Objetos de Costo">
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Importar Excel
        </Button>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Item
        </Button>
      </PageHeader>

      <Tabs defaultValue="resources">
        <TabsList>
          <TabsTrigger value="resources">Recursos</TabsTrigger>
          <TabsTrigger value="activities">Actividades</TabsTrigger>
          <TabsTrigger value="objects">Objetos de Costo</TabsTrigger>
        </TabsList>

        <TabsContent value="resources">
          <Card className="border-border/50 mt-4">
            <CardContent className="p-0">
              <DictionaryTable items={resources} type="resource" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities">
          <Card className="border-border/50 mt-4">
            <CardContent className="p-0">
              <DictionaryTable items={activities} type="activity" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="objects">
          <Card className="border-border/50 mt-4">
            <CardContent className="p-0">
              <DictionaryTable items={objects} type="object" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default DictionariesPage;
