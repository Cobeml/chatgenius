import { Sidebar } from "@/app/components/workspace/Sidebar";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function WorkspaceLayout({
  children,
  params
}: LayoutProps) {
  const resolvedParams = await params;

  return (
    <div className="h-screen overflow-hidden flex">
      <Sidebar workspaceId={resolvedParams.id} />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
} 