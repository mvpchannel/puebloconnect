import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createBopVotingPeriod, listBopVotingPeriods, BopVotingPeriodWithMeta } from "@/lib/db";

const MAX_LABEL_LENGTH = 50;

function shapePeriod(p: BopVotingPeriodWithMeta) {
  return {
    id: p.id,
    label: p.label,
    startsAt: p.starts_at,
    endsAt: p.ends_at,
    closedAt: p.closed_at,
    isOpen: Boolean(p.is_open),
    createdAt: p.created_at,
  };
}

// GET /api/best-of/periods — every voting period, newest-started first.
export async function GET() {
  const periods = listBopVotingPeriods();
  return NextResponse.json({ periods: periods.map(shapePeriod) });
}

// POST /api/best-of/periods — open a new voting period (e.g. "October
// 2026"). Admin only.
export async function POST(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { label, startsAt, endsAt } = (body ?? {}) as Record<string, unknown>;

  if (typeof label !== "string" || label.trim().length === 0) {
    return NextResponse.json({ error: "A label is required (e.g. 'October 2026')." }, { status: 400 });
  }
  if (label.length > MAX_LABEL_LENGTH) {
    return NextResponse.json(
      { error: `Label must be ${MAX_LABEL_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  let resolvedStartsAt: string | null = null;
  if (startsAt !== undefined && startsAt !== null) {
    if (typeof startsAt !== "string" || Number.isNaN(Date.parse(startsAt))) {
      return NextResponse.json({ error: "Invalid start date/time." }, { status: 400 });
    }
    resolvedStartsAt = startsAt;
  }

  let resolvedEndsAt: string | null = null;
  if (endsAt !== undefined && endsAt !== null) {
    if (typeof endsAt !== "string" || Number.isNaN(Date.parse(endsAt))) {
      return NextResponse.json({ error: "Invalid end date/time." }, { status: 400 });
    }
    resolvedEndsAt = endsAt;
  }

  const period = createBopVotingPeriod(label.trim(), resolvedStartsAt, resolvedEndsAt);
  return NextResponse.json({ period: shapePeriod(period) }, { status: 201 });
}
