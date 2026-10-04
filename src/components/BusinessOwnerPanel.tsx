"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export type BusinessMenuItemData = {
  id: number;
  section: "menu" | "service";
  name: string;
  description: string | null;
  priceCents: number | null;
};

export type BusinessJobData = {
  id: number;
  title: string;
  description: string | null;
};

export type BusinessDealData = {
  id: number;
  title: string;
  discountText: string;
  type: "standard" | "flash";
  expiresAt: string | null;
  claimCount: number;
  isActive: boolean;
};

type BusinessOwnerPanelProps = {
  slug: string;
  menuItems: BusinessMenuItemData[];
  jobs: BusinessJobData[];
  deals: BusinessDealData[];
};

function formatPrice(cents: number | null): string {
  if (cents === null) return "";
  return ` — $${(cents / 100).toFixed(2)}`;
}

// Owner-only editing surface for the channel's menu/services and job
// postings. Real backend: /api/businesses/:slug/menu(/:itemId) and
// /api/businesses/:slug/jobs(/:jobId/close), backed by
// business_menu_items / business_jobs in src/lib/db.ts.
export default function BusinessOwnerPanel({ slug, menuItems, jobs, deals }: BusinessOwnerPanelProps) {
  const router = useRouter();
  const [section, setSection] = useState<"menu" | "service">("menu");
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [dealTitle, setDealTitle] = useState("");
  const [dealDiscountText, setDealDiscountText] = useState("");
  const [dealType, setDealType] = useState<"standard" | "flash">("standard");
  const [dealExpiresAt, setDealExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addItem(e: FormEvent) {
    e.preventDefault();
    if (!itemName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const priceCents = itemPrice.trim() ? Math.round(Number(itemPrice) * 100) : null;
      const res = await fetch(`/api/businesses/${slug}/menu`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section,
          name: itemName.trim(),
          description: itemDescription.trim() || null,
          priceCents,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't add that item.");
        return;
      }
      setItemName("");
      setItemDescription("");
      setItemPrice("");
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(itemId: number) {
    setBusy(true);
    try {
      await fetch(`/api/businesses/${slug}/menu/${itemId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function addJob(e: FormEvent) {
    e.preventDefault();
    if (!jobTitle.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${slug}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: jobTitle.trim(), description: jobDescription.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't post that job.");
        return;
      }
      setJobTitle("");
      setJobDescription("");
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function closeJob(jobId: number) {
    setBusy(true);
    try {
      await fetch(`/api/businesses/${slug}/jobs/${jobId}/close`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function addDeal(e: FormEvent) {
    e.preventDefault();
    if (!dealTitle.trim() || !dealDiscountText.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${slug}/deals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: dealTitle.trim(),
          discountText: dealDiscountText.trim(),
          type: dealType,
          expiresAt: dealExpiresAt ? new Date(dealExpiresAt).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't post that deal.");
        return;
      }
      setDealTitle("");
      setDealDiscountText("");
      setDealExpiresAt("");
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function endDeal(dealId: number) {
    setBusy(true);
    try {
      await fetch(`/api/businesses/${slug}/deals/${dealId}/deactivate`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="widget stick-widget" style={{ marginTop: 20 }}>
      <h4 className="widget-title">Manage your channel</h4>
      <div style={{ padding: "0 16px 16px" }}>
        {error && (
          <p role="alert" style={{ color: "#e02020", marginBottom: 8 }}>
            {error}
          </p>
        )}

        <h5 style={{ marginBottom: 8 }}>Menu / services</h5>
        {menuItems.length === 0 && <p style={{ color: "#888", fontSize: 13 }}>Nothing added yet.</p>}
        {menuItems.map((item) => (
          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13 }}>
              [{item.section}] {item.name}
              {formatPrice(item.priceCents)}
            </span>
            <button
              type="button"
              className="mtr-btn signin"
              style={{ padding: "2px 8px", fontSize: 11 }}
              disabled={busy}
              onClick={() => removeItem(item.id)}
            >
              <span>Remove</span>
            </button>
          </div>
        ))}
        <form onSubmit={addItem} style={{ marginTop: 10, marginBottom: 20 }}>
          <select value={section} onChange={(e) => setSection(e.target.value as "menu" | "service")} style={{ marginBottom: 6, display: "block" }}>
            <option value="menu">Menu item</option>
            <option value="service">Service</option>
          </select>
          <input
            type="text"
            placeholder="Name"
            maxLength={100}
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            style={{ width: "100%", marginBottom: 6 }}
          />
          <input
            type="text"
            placeholder="Description (optional)"
            maxLength={500}
            value={itemDescription}
            onChange={(e) => setItemDescription(e.target.value)}
            style={{ width: "100%", marginBottom: 6 }}
          />
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Price (optional)"
            value={itemPrice}
            onChange={(e) => setItemPrice(e.target.value)}
            style={{ width: "100%", marginBottom: 6 }}
          />
          <button className="mtr-btn signup" type="submit" disabled={busy || !itemName.trim()}>
            <span>Add item</span>
          </button>
        </form>

        <h5 style={{ marginBottom: 8 }}>Jobs</h5>
        {jobs.length === 0 && <p style={{ color: "#888", fontSize: 13 }}>No open jobs.</p>}
        {jobs.map((job) => (
          <div key={job.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13 }}>{job.title}</span>
            <button
              type="button"
              className="mtr-btn signin"
              style={{ padding: "2px 8px", fontSize: 11 }}
              disabled={busy}
              onClick={() => closeJob(job.id)}
            >
              <span>Mark filled</span>
            </button>
          </div>
        ))}
        <form onSubmit={addJob} style={{ marginTop: 10 }}>
          <input
            type="text"
            placeholder="Job title"
            maxLength={100}
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            style={{ width: "100%", marginBottom: 6 }}
          />
          <input
            type="text"
            placeholder="Description (optional)"
            maxLength={2000}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            style={{ width: "100%", marginBottom: 6 }}
          />
          <button className="mtr-btn signup" type="submit" disabled={busy || !jobTitle.trim()}>
            <span>Post job</span>
          </button>
        </form>

        <h5 style={{ marginBottom: 8 }}>Deals</h5>
        {deals.filter((d) => d.isActive).length === 0 && (
          <p style={{ color: "#888", fontSize: 13 }}>No active deals.</p>
        )}
        {deals.filter((d) => d.isActive).map((deal) => (
          <div key={deal.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13 }}>
              {deal.type === "flash" ? "🔥 " : ""}
              {deal.title} — {deal.discountText} ({deal.claimCount} claimed)
            </span>
            <button
              type="button"
              className="mtr-btn signin"
              style={{ padding: "2px 8px", fontSize: 11 }}
              disabled={busy}
              onClick={() => endDeal(deal.id)}
            >
              <span>End deal</span>
            </button>
          </div>
        ))}
        <form onSubmit={addDeal} style={{ marginTop: 10 }}>
          <select
            value={dealType}
            onChange={(e) => setDealType(e.target.value as "standard" | "flash")}
            style={{ marginBottom: 6, display: "block" }}
          >
            <option value="standard">Standard deal</option>
            <option value="flash">Flash deal (expires soon)</option>
          </select>
          <input
            type="text"
            placeholder="Title (e.g. Weekend Special)"
            maxLength={100}
            value={dealTitle}
            onChange={(e) => setDealTitle(e.target.value)}
            style={{ width: "100%", marginBottom: 6 }}
          />
          <input
            type="text"
            placeholder="Discount (e.g. 25% off, $8.99)"
            maxLength={50}
            value={dealDiscountText}
            onChange={(e) => setDealDiscountText(e.target.value)}
            style={{ width: "100%", marginBottom: 6 }}
          />
          {dealType === "flash" && (
            <>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
                Expires (within 24 hours)
              </label>
              <input
                type="datetime-local"
                value={dealExpiresAt}
                onChange={(e) => setDealExpiresAt(e.target.value)}
                style={{ width: "100%", marginBottom: 6 }}
              />
            </>
          )}
          <button
            className="mtr-btn signup"
            type="submit"
            disabled={busy || !dealTitle.trim() || !dealDiscountText.trim() || (dealType === "flash" && !dealExpiresAt)}
          >
            <span>Post deal</span>
          </button>
        </form>
      </div>
    </div>
  );
}
