import { notFound, redirect } from "next/navigation";
import { DemoWorkspace } from "@/components/layout/workspace";
import { LiveWorkspace } from "@/components/layout/live-workspace";
import { SetupNotice } from "@/components/auth/setup-notice";
import { firebaseConfigured } from "@/lib/firebase/config";
import { adminConfigured } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/session";

export default async function SpaceLayout({ children, params }: LayoutProps<"/[space]">) {
  const { space } = await params;
  if (space === "demo") return <DemoWorkspace>{children}</DemoWorkspace>;
  if (space !== "app") notFound();

  if (!firebaseConfigured || !adminConfigured()) return <SetupNotice />;
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/app");
  return (
    <LiveWorkspace uid={user.uid} email={user.email} aiConfigured={Boolean(process.env.ANTHROPIC_API_KEY)}>
      {children}
    </LiveWorkspace>
  );
}
