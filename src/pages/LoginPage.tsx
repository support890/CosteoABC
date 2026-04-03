import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Moon, Sun, Loader2 } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error al iniciar sesión",
        description:
          error.message === "Invalid login credentials"
            ? "Correo o contraseña incorrectos"
            : error.message,
      });
      return;
    }

    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Left side - Image panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 to-black/50" />
        <img
          src="/images/rentabilidad-flow.png"
          alt="The Black Box - De recursos a rentabilidad"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-12 text-primary-foreground">
          <div className="rounded-xl bg-black/50 backdrop-blur-sm p-8 max-w-md">
            <h2 className="text-3xl font-bold mb-4">
              Domina tus costos.
              <br />
              Impulsa tu estrategia.
            </h2>
            <p className="text-primary-foreground/80 mb-6">
              Transforma tus datos contables en información estratégica con el
              poder del costeo basado en actividades y el Balanced Scorecard.
            </p>
            <div className="grid grid-cols-3 gap-4">
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
        </div>
        <div className="absolute bottom-12 left-12 z-10">
          <p className="text-xs text-primary-foreground/60">
            &copy; 2026 The Black Box
          </p>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex w-full flex-col lg:w-1/2">
        <div className="flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 lg:invisible">
            <img src={theme === "dark" ? "/images/logo-white.png" : "/images/logo-bb.png"} alt="The Black Box" className="h-8" />
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

        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-16">
          <div className="mb-8">
            <Link to="/">
              <img
                src={theme === "dark" ? "/images/logo-white.png" : "/images/logo-bb.png"}
                alt="The Black Box"
                className="h-16 w-auto"
              />
            </Link>
          </div>
          <Card className="w-full max-w-sm border-border/50 shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
              <p className="text-sm text-muted-foreground">
                Ingresa tus credenciales para acceder a la plataforma
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Contraseña</Label>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {loading ? "Ingresando..." : "Ingresar"}
                </Button>
              </form>

              <Separator className="my-6" />

              <p className="text-center text-sm text-muted-foreground">
                ¿No tienes cuenta?{" "}
                <Link
                  to="/register"
                  className="font-medium text-primary hover:underline"
                >
                  Comienza tu prueba gratuita
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
