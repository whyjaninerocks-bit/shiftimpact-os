// app/(os)/growth-sprint/demo/[slug]/page.tsx
// Growth Sprint Pilot Demo Mode — guided walkthrough loader
// INTERNAL ONLY

import { notFound } from "next/navigation";
import { getDemoScenario } from "@/lib/growth-sprint/demo-scenarios";
import { DemoWalkthrough } from "./_components/DemoWalkthrough";

export default async function GrowthSprintDemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const scenario = getDemoScenario(slug);
  if (!scenario) notFound();

  return <DemoWalkthrough scenario={scenario} />;
}
