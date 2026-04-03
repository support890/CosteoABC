import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Moon, Sun, Loader2 } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { signUp } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [plan, setPlan] = useState("starter");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signUp(email, password, {
      full_name: name,
      company,
    });
    setLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error al crear cuenta",
        description: error.message,
      });
      return;
    }

    toast({
      title: "Cuenta creada",
      description: "Revisa tu correo para confirmar tu cuenta.",
    });
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Left side - Image panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 to-black/50" />
        <img
          src="/images/driver-relationships.png"
          alt="The Black Box - Relaciones de drivers y costeo"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground">
          <Link to="/">
            <img src="/images/logo-white.png" alt="The Black Box" className="h-12" />
          </Link>
          <div className="rounded-xl bg-black/50 backdrop-blur-sm p-8">
            <h2 className="text-3xl font-bold mb-4">
              Comienza tu transformación financiera
            </h2>
            <p className="text-primary-foreground/80 max-w-md">
              Únete a las empresas que ya toman decisiones basadas en datos
              reales, no en intuición. 14 días de prueba gratuita sin tarjeta de
              crédito.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div>
                <p className="text-2xl font-bold">80%</p>
                <p className="text-xs text-primary-foreground/70">
                  Menos tiempo de cierre
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold">100%</p>
                <p className="text-xs text-primary-foreground/70">
                  Trazabilidad
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-primary-foreground/70">
                  Errores de redondeo
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs text-primary-foreground/60">
            &copy; 2026 The Black Box
          </p>
        </div>
      </div>

      {/* Right side - Register form */}
      <div className="flex w-full flex-col lg:w-1/2">
        <div className="flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 lg:invisible">
            <img src="/images/logo-tbb.png" alt="The Black Box" className="h-8" />
            <span className="text-lg font-bold">The Black Box</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <Card className="w-full max-w-md border-border/50">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Crea tu cuenta</CardTitle>
              <p className="text-sm text-muted-foreground">
                14 días de prueba gratuita &mdash; Sin tarjeta de crédito
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre completo</Label>
                    <Input
                      id="name"
                      placeholder="Juan Pérez"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Empresa</Label>
                    <Input
                      id="company"
                      placeholder="Mi Empresa S.A."
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Correo electrónico</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="tu@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Contraseña</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Plan seleccionado</Label>
                  <Select
                    value={plan}
                    onValueChange={setPlan}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">
                        Starter — $49 USD/mes
                      </SelectItem>
                      <SelectItem value="pro">Pro — $199 USD/mes</SelectItem>
                      <SelectItem value="enterprise">
                        Enterprise — Contactar ventas
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="terms"
                    checked={accepted}
                    onCheckedChange={(v) => setAccepted(v === true)}
                    disabled={loading}
                  />
                  <label
                    htmlFor="terms"
                    className="text-xs text-muted-foreground leading-tight cursor-pointer"
                  >
                    Acepto los{" "}
                    <Link to="/terms" className="text-primary hover:underline">
                      Términos de Servicio
                    </Link>{" "}
                    y la{" "}
                    <Link
                      to="/privacy"
                      className="text-primary hover:underline"
                    >
                      Política de Privacidad
                    </Link>
                  </label>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={!accepted || loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {loading ? "Creando cuenta..." : "Comenzar prueba gratuita"}
                </Button>
              </form>

              <Separator className="my-6" />

              <p className="text-center text-sm text-muted-foreground">
                ¿Ya tienes cuenta?{" "}
                <Link
                  to="/login"
                  className="font-medium text-primary hover:underline"
                >
                  Inicia sesión
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
