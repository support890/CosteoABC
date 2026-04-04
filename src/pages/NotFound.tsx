import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Background decorations */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
      <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-primary/5 blur-3xl -z-10" />
      <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-primary/3 blur-3xl -z-10" />

      {/* Navbar */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <Link to="/">
            <img src="/images/logo-white.png" alt="The Black Box" className="h-10 dark:block hidden" />
            <img src="/images/logo-bb.png" alt="The Black Box" className="h-10 dark:hidden block" />
          </Link>
          <Button size="sm" asChild>
            <Link to="/login">Ingresar</Link>
          </Button>
        </div>
      </nav>

      {/* Main content */}
      <div className="flex flex-1 items-center justify-center px-6 py-24">
        <div className="text-center max-w-lg">
          {/* 404 number */}
          <div className="mb-6">
            <span className="text-[10rem] font-extrabold leading-none tracking-tight text-primary/10 select-none">
              404
            </span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl mb-4">
            Página no encontrada
          </h1>
          <p className="text-muted-foreground text-lg mb-2">
            La ruta{" "}
            <code className="rounded bg-muted px-2 py-0.5 text-sm font-mono text-foreground">
              {location.pathname}
            </code>{" "}
            no existe.
          </p>
          <p className="text-muted-foreground mb-10">
            Es posible que la página haya sido movida, eliminada o que hayas
            escrito la dirección incorrectamente.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="gap-2 px-8" asChild>
              <Link to="/">
                <Home className="h-4 w-4" />
                Volver al inicio
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="gap-2" asChild>
              <Link to="/login">
                Ir al dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
