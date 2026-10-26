import type { LifeData } from "@/lib/domain/types";
import type { DataMode } from "./backend";

/** Downloads everything LifeOS holds for this user as a JSON file. Runs entirely in the browser. */
export function exportLifeData(data: LifeData, mode: DataMode) {
  const payload = {
    exportedAt: new Date().toISOString(),
    source: mode === "demo" ? "LifeOS demo (sample data)" : "LifeOS",
    version: 1,
    data,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lifeos-export-${new Date().toISOString().slice(0, 10)}${mode === "demo" ? "-demo" : ""}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
