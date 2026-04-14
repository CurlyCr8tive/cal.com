/**
 * CPR tRPC Test Panel — /cpr-panel
 * DEV-ONLY: Test all 5 CPR booking/reschedule request routes from the browser.
 * Automatically blocked in production (returns 404).
 */

import { useState } from "react";
import Head from "next/head";
import type { GetServerSideProps } from "next";

// ─── Block in production ──────────────────────────────────────────────────────
export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.NODE_ENV === "production") {
    return { notFound: true };
  }
  return { props: {} };
};

// ─── tRPC caller helpers ──────────────────────────────────────────────────────
const BASE = "/api/trpc/bookings";

async function callMutation(procedure: string, input: Record<string, unknown>) {
  const res = await fetch(`${BASE}/${procedure}?batch=1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "0": { json: input } }),
  });
  const json = await res.json();
  return json?.[0]?.result?.data?.json ?? json?.[0]?.error ?? json;
}

async function callQuery(procedure: string, input: Record<string, unknown>) {
  const encoded = encodeURIComponent(JSON.stringify({ "0": { json: input } }));
  const res = await fetch(`${BASE}/${procedure}?batch=1&input=${encoded}`);
  const json = await res.json();
  return json?.[0]?.result?.data?.json ?? json?.[0]?.error ?? json;
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────
function Card({ title, badge, children }: { title: string; badge: string; children: React.ReactNode }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>{title}</h2>
        <span style={badge === "mutation" ? styles.badgeMutation : styles.badgeQuery}>{badge}</span>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={styles.input} />;
}

function RunButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button onClick={onClick} disabled={loading} style={styles.button}>
      {loading ? "⏳ Running…" : "▶ Run"}
    </button>
  );
}

function Result({ data }: { data: unknown }) {
  if (data === null) return null;
  const isError = data && typeof data === "object" && "message" in (data as object);
  return (
    <pre style={{ ...styles.result, borderColor: isError ? "#f87171" : "#34d399" }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

// ─── Route panels ─────────────────────────────────────────────────────────────

function CreateBookingRequest() {
  const [eventTypeId, setEventTypeId] = useState("1");
  const [email, setEmail] = useState("guest@example.com");
  const [name, setName] = useState("Jane Guest");
  const [notes, setNotes] = useState("");
  const [startTime, setStartTime] = useState("2025-06-01T10:00:00.000Z");
  const [endTime, setEndTime] = useState("2025-06-01T11:00:00.000Z");
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const data = await callMutation("createBookingRequest", {
      eventTypeId: Number(eventTypeId),
      email,
      name,
      notes: notes || undefined,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
    });
    setResult(data);
    setLoading(false);
  };

  return (
    <Card title="createBookingRequest" badge="mutation">
      <p style={styles.desc}>Host creates a booking invite link for a guest.</p>
      <Field label="eventTypeId (number)">
        <Input value={eventTypeId} onChange={(e) => setEventTypeId(e.target.value)} type="number" />
      </Field>
      <Field label="email">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="name">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="notes (optional)">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="optional notes" />
      </Field>
      <Field label="startTime (ISO)">
        <Input value={startTime} onChange={(e) => setStartTime(e.target.value)} />
      </Field>
      <Field label="endTime (ISO)">
        <Input value={endTime} onChange={(e) => setEndTime(e.target.value)} />
      </Field>
      <RunButton onClick={run} loading={loading} />
      <Result data={result} />
    </Card>
  );
}

function ListBookingRequests() {
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const data = await callQuery("listBookingRequests", {
      ...(status ? { status } : {}),
    });
    setResult(data);
    setLoading(false);
  };

  return (
    <Card title="listBookingRequests" badge="query">
      <p style={styles.desc}>Host lists all their booking requests (optionally filtered by status).</p>
      <Field label="status (optional)">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ ...styles.input, cursor: "pointer" }}>
          <option value="">— all —</option>
          <option value="PENDING">PENDING</option>
          <option value="ACCEPTED">ACCEPTED</option>
          <option value="DECLINED">DECLINED</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="EXPIRED">EXPIRED</option>
        </select>
      </Field>
      <RunButton onClick={run} loading={loading} />
      <Result data={result} />
    </Card>
  );
}

function CancelBookingRequest() {
  const [bookingRequestId, setBookingRequestId] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const data = await callMutation("cancelBookingRequest", { bookingRequestId });
    setResult(data);
    setLoading(false);
  };

  return (
    <Card title="cancelBookingRequest" badge="mutation">
      <p style={styles.desc}>Host cancels a PENDING booking request.</p>
      <Field label="bookingRequestId">
        <Input
          value={bookingRequestId}
          onChange={(e) => setBookingRequestId(e.target.value)}
          placeholder="e.g. clxyz123..."
        />
      </Field>
      <RunButton onClick={run} loading={loading} />
      <Result data={result} />
    </Card>
  );
}

function RequestRescheduleAsAttendee() {
  const [bookingId, setBookingId] = useState("");
  const [otp, setOtp] = useState("");
  const [proposedStart, setProposedStart] = useState("2025-06-02T10:00:00.000Z");
  const [proposedEnd, setProposedEnd] = useState("2025-06-02T11:00:00.000Z");
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const data = await callMutation("requestRescheduleAsAttendee", {
      bookingId,
      oneTimePassword: otp,
      proposedStartTime: proposedStart ? new Date(proposedStart) : undefined,
      proposedEndTime: proposedEnd ? new Date(proposedEnd) : undefined,
      reason: reason || undefined,
    });
    setResult(data);
    setLoading(false);
  };

  return (
    <Card title="requestRescheduleAsAttendee" badge="mutation">
      <p style={styles.desc}>
        🌐 <strong>Public</strong> — Guest requests a reschedule via OTP token (base64 encoded email).
      </p>
      <Field label="bookingId">
        <Input value={bookingId} onChange={(e) => setBookingId(e.target.value)} placeholder="booking cuid" />
      </Field>
      <Field label="oneTimePassword (base64 of 'email:xxx')">
        <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="base64 OTP" />
      </Field>
      <Field label="proposedStartTime (ISO, optional)">
        <Input value={proposedStart} onChange={(e) => setProposedStart(e.target.value)} />
      </Field>
      <Field label="proposedEndTime (ISO, optional)">
        <Input value={proposedEnd} onChange={(e) => setProposedEnd(e.target.value)} />
      </Field>
      <Field label="reason (optional)">
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="reason for reschedule" />
      </Field>
      <RunButton onClick={run} loading={loading} />
      <Result data={result} />
    </Card>
  );
}

function RespondToRescheduleRequest() {
  const [rescheduleRequestId, setRescheduleRequestId] = useState("");
  const [response, setResponse] = useState<"ACCEPTED" | "DECLINED">("ACCEPTED");
  const [counterStart, setCounterStart] = useState("");
  const [counterEnd, setCounterEnd] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const data = await callMutation("respondToRescheduleRequest", {
      rescheduleRequestId,
      response,
      counterProposalStartTime: counterStart ? new Date(counterStart) : undefined,
      counterProposalEndTime: counterEnd ? new Date(counterEnd) : undefined,
    });
    setResult(data);
    setLoading(false);
  };

  return (
    <Card title="respondToRescheduleRequest" badge="mutation">
      <p style={styles.desc}>Host accepts or declines a guest's reschedule request.</p>
      <Field label="rescheduleRequestId">
        <Input
          value={rescheduleRequestId}
          onChange={(e) => setRescheduleRequestId(e.target.value)}
          placeholder="reschedule request cuid"
        />
      </Field>
      <Field label="response">
        <select
          value={response}
          onChange={(e) => setResponse(e.target.value as "ACCEPTED" | "DECLINED")}
          style={{ ...styles.input, cursor: "pointer" }}>
          <option value="ACCEPTED">ACCEPTED</option>
          <option value="DECLINED">DECLINED</option>
        </select>
      </Field>
      <Field label="counterProposalStartTime (ISO, optional)">
        <Input value={counterStart} onChange={(e) => setCounterStart(e.target.value)} placeholder="optional" />
      </Field>
      <Field label="counterProposalEndTime (ISO, optional)">
        <Input value={counterEnd} onChange={(e) => setCounterEnd(e.target.value)} placeholder="optional" />
      </Field>
      <RunButton onClick={run} loading={loading} />
      <Result data={result} />
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CprPanel() {
  return (
    <>
      <Head>
        <title>CPR tRPC Panel — Dev Only</title>
      </Head>
      <div style={styles.page}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.h1}>⚡ CPR tRPC Test Panel</h1>
            <p style={styles.subtitle}>
              Dev-only • Booking Request &amp; Reschedule Request routes •{" "}
              <code style={styles.code}>/api/trpc/bookings/*</code>
            </p>
          </div>
          <span style={styles.devBadge}>DEV ONLY</span>
        </div>

        <div style={styles.notice}>
          <strong>🔐 Auth required</strong> — Log in to Cal.com first, then come back here. Routes marked{" "}
          <strong>Public</strong> work without login.
        </div>

        <div style={styles.grid}>
          <CreateBookingRequest />
          <ListBookingRequests />
          <CancelBookingRequest />
          <RequestRescheduleAsAttendee />
          <RespondToRescheduleRequest />
        </div>

        <div style={styles.footer}>
          CPR Panel • Auto-disabled in production •{" "}
          <a href="https://github.com/CurlyCr8tive/cal.com/tree/CPR" style={{ color: "#818cf8" }}>
            View branch on GitHub ↗
          </a>
        </div>
      </div>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)",
    color: "#e2e8f0",
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    padding: "2rem",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: "1.5rem",
    flexWrap: "wrap",
    gap: "1rem",
  },
  h1: {
    fontSize: "2rem",
    fontWeight: 800,
    background: "linear-gradient(90deg, #818cf8, #a78bfa, #38bdf8)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    margin: 0,
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: "0.9rem",
    marginTop: "0.4rem",
  },
  code: {
    background: "#1e293b",
    padding: "0.1rem 0.4rem",
    borderRadius: "4px",
    fontSize: "0.85rem",
    color: "#38bdf8",
  },
  devBadge: {
    background: "linear-gradient(90deg, #f59e0b, #ef4444)",
    color: "#fff",
    fontWeight: 700,
    fontSize: "0.75rem",
    padding: "0.35rem 0.75rem",
    borderRadius: "999px",
    letterSpacing: "0.1em",
  },
  notice: {
    background: "rgba(99,102,241,0.15)",
    border: "1px solid rgba(99,102,241,0.4)",
    borderRadius: "10px",
    padding: "0.9rem 1.2rem",
    marginBottom: "2rem",
    fontSize: "0.9rem",
    color: "#c7d2fe",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(520px, 1fr))",
    gap: "1.5rem",
  },
  card: {
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "14px",
    padding: "1.5rem",
    transition: "border-color 0.2s",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "0.5rem",
  },
  cardTitle: {
    margin: 0,
    fontSize: "1.05rem",
    fontWeight: 700,
    color: "#e2e8f0",
    fontFamily: "monospace",
  },
  badgeMutation: {
    background: "rgba(239,68,68,0.2)",
    color: "#fca5a5",
    border: "1px solid rgba(239,68,68,0.4)",
    padding: "0.15rem 0.6rem",
    borderRadius: "999px",
    fontSize: "0.7rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  badgeQuery: {
    background: "rgba(52,211,153,0.15)",
    color: "#6ee7b7",
    border: "1px solid rgba(52,211,153,0.3)",
    padding: "0.15rem 0.6rem",
    borderRadius: "999px",
    fontSize: "0.7rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  desc: {
    color: "#94a3b8",
    fontSize: "0.85rem",
    marginBottom: "1rem",
    marginTop: "0.25rem",
  },
  field: {
    marginBottom: "0.75rem",
  },
  label: {
    display: "block",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#94a3b8",
    marginBottom: "0.3rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  input: {
    width: "100%",
    background: "rgba(15,23,42,0.8)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    padding: "0.5rem 0.75rem",
    color: "#e2e8f0",
    fontSize: "0.9rem",
    outline: "none",
    boxSizing: "border-box",
  },
  button: {
    marginTop: "0.75rem",
    background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "0.6rem 1.4rem",
    fontWeight: 700,
    fontSize: "0.9rem",
    cursor: "pointer",
    transition: "opacity 0.2s",
  },
  result: {
    marginTop: "1rem",
    background: "rgba(0,0,0,0.4)",
    border: "1px solid #34d399",
    borderRadius: "8px",
    padding: "0.9rem",
    fontSize: "0.8rem",
    color: "#a7f3d0",
    overflowX: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
  },
  footer: {
    marginTop: "3rem",
    textAlign: "center",
    color: "#475569",
    fontSize: "0.8rem",
  },
};
