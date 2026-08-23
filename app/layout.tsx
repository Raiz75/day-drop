/* AI-CONTEXT-NOTE:{"R":"Root layout - fonts, PWA metadata/viewport, manifest link, wraps all routes in ThemeProvider + Toaster.","IDD":[{"?":"appleWebApp + manifest metadata make the app installable on iOS/Android standalone."},{"?":"suppressHydrationWarning required because next-themes swaps classes on <html>."},{"?":"Pages are force-dynamic client-driven; this is the server shell."}],"A":[{"!!!":"all routes","CRITICAL":"removing ThemeProvider or Toaster breaks theming/toasts app-wide"},{"?":"public/manifest.webmanifest (linked here)"}],"AB":[{"?":"components/theme-provider.tsx"},{"?":"components/ui/sonner.tsx"},{"?":"app/globals.css font vars"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Verify manifest/appleWebApp/viewport survive refactors"}]} */
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Roboto } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const roboto = Roboto({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DayDrop",
  description: "Your day, dropped in - a story-like journal tracker.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "DayDrop" },
};

export const viewport: Viewport = { themeColor: "#e8833a", width: "device-width", initialScale: 1 };

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", roboto.variable)}>
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
