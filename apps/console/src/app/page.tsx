import * as React from "react";
import { ConsoleShell } from "./console-shell.js";

export const dynamic = "force-static";

export default function DashboardPage(): React.ReactElement {
  return <ConsoleShell />;
}
