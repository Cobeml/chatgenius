import { Sidebar } from "@/app/components/workspace/Sidebar";

export default function WorkspaceLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  return (
    <div className="h-screen flex">
      <Sidebar workspaceId={params.id} />
      <main className="flex-1">{children}</main>
    </div>
  );
} 