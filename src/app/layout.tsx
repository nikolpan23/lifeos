import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

// One family for headings and text; it includes Greek so notes and tasks typed in Greek match.
const manrope = Manrope({ variable: "--font-body", subsets: ["latin", "greek"] });

export const metadata: Metadata = {
  title: { default: "LifeOS — Your life, beautifully organized", template: "%s · LifeOS" },
  description: "One intelligent space for your tasks, habits, goals, notes, and schedule. Plan better, see what matters, and make smarter decisions.",
  applicationName: "LifeOS",
};

export const viewport: Viewport = {
  themeColor: "#F5EFE3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="light" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <Toaster
          position="bottom-right"
          mobileOffset={{ bottom: 84 }}
          toastOptions={{
            classNames: {
              toast: "!rounded-[14px] !border !border-border !bg-surface !text-foreground !shadow-lift !font-sans",
              description: "!text-muted-foreground",
            },
          }}
        />
      </body>
    </html>
  );
}
