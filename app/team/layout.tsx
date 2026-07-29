import { OsNav } from "@/app/_components/OsNav";

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <OsNav />
      <main className="lg:pl-56 pt-[57px] lg:pt-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
