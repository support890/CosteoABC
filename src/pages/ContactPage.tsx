import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Moon, Sun, Mail, Building2, MessageSquare } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";

export default function ContactPage() {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Mensaje enviado",
      description:
        "Nos pondremos en contacto contigo dentro de 24 horas hábiles.",
    });
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/images/logo-tbb.png" alt="The Black Box" className="h-8" />
            <span className="text-lg font-bold">The Black Box</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="mr-2"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button asChild>
              <Link to="/login">Ingresar</Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-extrabold sm:text-4xl">
            Contactar ventas
          </h1>
          <p className="mt-3 text-muted-foreground">
            Cuéntanos sobre tu empresa y te diseñamos un plan Enterprise a
            medida.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-3">
          {/* Info cards */}
          <div className="space-y-6 lg:col-span-1">
            <Card className="border-border/50">
              <CardContent className="flex items-start gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Email</h3>
                  <p className="text-sm text-muted-foreground">
                    ventas@theblackbox.com
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="flex items-start gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Para empresas</h3>
                  <p className="text-sm text-muted-foreground">
                    Tenants ilimitados, DB aislada, SLA dedicado y conectores
                    ERP nativos.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="flex items-start gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Respuesta rápida</h3>
                  <p className="text-sm text-muted-foreground">
                    Te respondemos en menos de 24 horas hábiles.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Form */}
          <Card className="border-border/50 lg:col-span-2">
            <CardHeader>
              <CardTitle>Envíanos un mensaje</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="c-name">Nombre completo</Label>
                    <Input
                      id="c-name"
                      placeholder="Juan Pérez"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-email">Correo electrónico</Label>
                    <Input
                      id="c-email"
                      type="email"
                      placeholder="tu@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Asunto</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un asunto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enterprise">
                        Plan Enterprise
                      </SelectItem>
                      <SelectItem value="demo">Solicitar demo</SelectItem>
                      <SelectItem value="integration">
                        Integración ERP
                      </SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-message">Mensaje</Label>
                  <Textarea
                    id="c-message"
                    placeholder="Cuéntanos sobre tu empresa, número de usuarios estimado, y qué necesitas..."
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" size="lg" className="w-full">
                  Enviar mensaje
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-8 mt-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <img src="/images/logo-tbb.png" alt="The Black Box" className="h-6" />
            <span>The Black Box Cloud Platform</span>
          </div>
          <p>&copy; 2026 The Black Box. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
