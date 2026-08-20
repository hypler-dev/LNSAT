import * as React from "react";
import { ConsoleShell } from "../console-shell.js";
import { consoleSectionSlugs, findConsoleSection } from "../../lib/console-model.js";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams(): Array<{ section: string }> {
  return consoleSectionSlugs.map((section) => ({ section }));
}

export default async function ConsoleSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<React.ReactElement> {
  const { section: slug } = await params;
  const section = findConsoleSection(slug);
  if (!section) return <ConsoleShell />;
  return <ConsoleShell section={section} />;
}
