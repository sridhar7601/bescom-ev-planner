"use client";

import { Download } from "lucide-react";

export interface ExportRow {
  area: string;
  pincode: string;
  district: string;
  category: string;
  ports: number;
  siteScorePct: number;
  feederPct: number;
  monthlyRevenueInr: number;
  paybackMonths: number;
  status: string;
}

export function CsvExportButton({ rows }: { rows: ExportRow[] }) {
  function handleClick() {
    const header = "Area,Pincode,District,Category,Ports,SiteScore_%,FeederImpact_%,MonthlyRevenue_INR,PaybackMonths,Status";
    const csv = rows.map((r) =>
      [
        `"${r.area.replace(/"/g, '""')}"`,
        r.pincode,
        `"${r.district.replace(/"/g, '""')}"`,
        r.category,
        r.ports,
        r.siteScorePct.toFixed(1),
        r.feederPct.toFixed(1),
        r.monthlyRevenueInr.toFixed(0),
        r.paybackMonths.toFixed(1),
        r.status,
      ].join(","),
    );
    const blob = new Blob([[header, ...csv].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chargesense_proposals_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleClick}
      className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
    >
      <Download size={14} />
      Export CSV
    </button>
  );
}
