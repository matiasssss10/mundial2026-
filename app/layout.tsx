// app/layout.tsx
import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ 
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mundial 2026 IA Predictor",
  description: "Motor xG · ELO · Poisson · Monte Carlo · Análisis estadístico de entretenimiento",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${outfit.variable}`}>
      <body className="bg-brand-dark text-brand-light antialiased min-h-screen flex flex-col">
        {/* Background ambient glow and technical grid */}
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-brand-dark">
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
          {/* Animated glows */}
          <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-brand-secondary/15 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute top-[30%] -right-[10%] w-[50%] h-[50%] rounded-full bg-brand-accent/10 blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
          <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[50%] rounded-full bg-brand-success/10 blur-[120px] animate-pulse" style={{ animationDuration: '10s' }} />
        </div>
        {children}
      </body>
    </html>
  );
}
