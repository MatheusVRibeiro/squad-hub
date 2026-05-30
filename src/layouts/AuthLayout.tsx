import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthLayout({ title, subtitle, children, footer }: Props) {
  return (
    <div className="relative grid min-h-screen bg-background lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-primary to-[oklch(0.40_0.18_263)] p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

        <Link to="/" className="relative flex items-center gap-2 text-lg font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur">
            <Sparkles className="h-4 w-4" />
          </span>
          MonteSquad
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative space-y-4"
        >
          <h2 className="text-3xl font-semibold leading-tight">
            Monte squads. Construa projetos. Cresça junto.
          </h2>
          <p className="max-w-md text-sm text-white/80">
            A plataforma onde devs, designers e PMs se encontram para tirar ideias do papel.
          </p>
        </motion.div>

        <p className="relative text-xs text-white/60">© {new Date().getFullYear()} MonteSquad</p>
      </div>

      {/* Form panel */}
      <div className="relative flex items-center justify-center overflow-hidden px-6 py-12 sm:px-10">
        {/* Background decorative blurs */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl dark:bg-primary/5" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl dark:bg-primary/5" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative w-full max-w-md rounded-3xl border border-border/60 bg-card/60 p-8 shadow-xl backdrop-blur-md dark:bg-card/45"
        >
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-lg font-semibold">MonteSquad</span>
          </div>

          <div className="mb-6 space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>

          {children}

          {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
        </motion.div>
      </div>
    </div>
  );
}