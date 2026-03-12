import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown, Target, Plus } from "lucide-react";
import { useState } from "react";

interface KPINode {
  id: string;
  name: string;
  direction: "maximize" | "minimize" | "stabilize";
  weight: number;
  actual?: number;
  target?: number;
  alarm?: number;
  score?: number;
  status: "success" | "warning" | "danger";
  children?: KPINode[];
}

const strategyTree: KPINode[] = [
  {
    id: "f1",
    name: "Perspectiva Financiera",
    direction: "maximize",
    weight: 35,
    score: 7.8,
    status: "success",
    children: [
      { id: "f1-1", name: "ROI", direction: "maximize", weight: 50, actual: 18, target: 15, alarm: 8, score: 8.2, status: "success" },
      { id: "f1-2", name: "Margen Neto", direction: "maximize", weight: 50, actual: 12, target: 10, alarm: 5, score: 7.5, status: "success" },
    ],
  },
  {
    id: "c1",
    name: "Perspectiva de Clientes",
    direction: "maximize",
    weight: 25,
    score: 5.9,
    status: "warning",
    children: [
      { id: "c1-1", name: "NPS", direction: "maximize", weight: 60, actual: 55, target: 70, alarm: 40, score: 5.8, status: "warning" },
      { id: "c1-2", name: "Retención", direction: "maximize", weight: 40, actual: 78, target: 85, alarm: 60, score: 6.1, status: "warning" },
    ],
  },
  {
    id: "p1",
    name: "Perspectiva de Procesos",
    direction: "minimize",
    weight: 25,
    score: 5.5,
    status: "warning",
    children: [
      { id: "p1-1", name: "Tiempo de Ciclo (días)", direction: "minimize", weight: 50, actual: 14, target: 7, alarm: 21, score: 3.2, status: "danger" },
      { id: "p1-2", name: "Tasa de Defectos (%)", direction: "minimize", weight: 50, actual: 2.1, target: 3, alarm: 5, score: 7.9, status: "success" },
    ],
  },
  {
    id: "a1",
    name: "Aprendizaje y Crecimiento",
    direction: "maximize",
    weight: 15,
    score: 6.5,
    status: "warning",
    children: [
      { id: "a1-1", name: "Horas Capacitación", direction: "maximize", weight: 50, actual: 42, target: 40, alarm: 20, score: 8.5, status: "success" },
      { id: "a1-2", name: "Índice Innovación", direction: "maximize", weight: 50, actual: 3.2, target: 5, alarm: 2, score: 4.5, status: "warning" },
    ],
  },
];

function KPITreeItem({ node, depth = 0 }: { node: KPINode; depth?: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  const statusDot = {
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
  };

  return (
    <div>
      <div
        className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-accent/50 cursor-pointer transition-colors"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <Target className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <div className={`h-2 w-2 rounded-full ${statusDot[node.status]} shrink-0`} />
        <span className={`text-sm ${depth === 0 ? "font-semibold" : "font-medium"} flex-1`}>{node.name}</span>
        <span className="text-xs text-muted-foreground">{node.weight}%</span>
        {node.score !== undefined && (
          <span className={`text-sm font-bold ${node.status === "success" ? "text-success" : node.status === "warning" ? "text-warning" : "text-danger"}`}>
            {node.score.toFixed(1)}
          </span>
        )}
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children!.map((child) => (
            <KPITreeItem key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

const StrategyPage = () => {
  return (
    <AppLayout>
      <PageHeader title="Estrategia (BSC)" description="Balanced Scorecard — Árbol de KPIs y Objetivos Estratégicos">
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo KPI
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tree View */}
        <div className="lg:col-span-2">
          <Card className="border-border/50">
            <CardContent className="p-4">
              {strategyTree.map((node) => (
                <KPITreeItem key={node.id} node={node} />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Detail Panel */}
        <div>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-4">Detalle del KPI</h3>
              <p className="text-xs text-muted-foreground mb-6">Selecciona un KPI del árbol para ver sus detalles y editar valores.</p>

              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor Real</span>
                  <span className="font-mono font-medium">—</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Objetivo</span>
                  <span className="font-mono font-medium">—</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Alarma</span>
                  <span className="font-mono font-medium">—</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Dirección</span>
                  <span className="font-mono font-medium">—</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Puntaje (0-10)</span>
                  <span className="font-mono font-medium">—</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default StrategyPage;
