import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const body = Figtree({ variable: "--font-body", subsets: ["latin"] });
const serif = Fraunces({ variable: "--font-serif", subsets: ["latin"], axes: ["opsz", "SOFT"] });

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
    <html lang="en" data-theme="light" className={`${body.variable} ${serif.variable} h-full antialiased`}>
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
