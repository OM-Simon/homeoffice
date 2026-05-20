import { useState, useMemo, useEffect } from "react";
import { db } from "./firebase";
import { doc, onSnapshot, setDoc, collection, addDoc, serverTimestamp, query, orderBy } from "firebase/firestore";

const TEAM = [
  { id: 1,  name: "Beatriz dos Santos", avatar: "BS",  color: "#6366f1", isSuper: false },
  { id: 2,  name: "Cláudia Fortunato",  avatar: "CF",  color: "#f59e0b", isSuper: false },
  { id: 3,  name: "Elisabete França",   avatar: "EFr", color: "#10b981", isSuper: false },
  { id: 4,  name: "Eva Fernandes",      avatar: "EFe", color: "#ef4444", isSuper: false },
  { id: 5,  name: "João Santos",        avatar: "JSa", color: "#8b5cf6", isSuper: false },
  { id: 6,  name: "João Silva",         avatar: "JSi", color: "#06b6d4", isSuper: false },
  { id: 7,  name: "Liane Bento",        avatar: "LB",  color: "#f43f5e", isSuper: false },
  { id: 8,  name: "Luis Abreu",         avatar: "LA",  color: "#84cc16", isSuper: false },
  { id: 9,  name: "Miguel Fonseca",     avatar: "MF",  color: "#fb923c", isSuper: false },
  { id: 10, name: "Nuno Lopes",         avatar: "NL",  color: "#a78bfa", isSuper: false },
  { id: 11, name: "Ricardo Anderson",   avatar: "RA",  color: "#2dd4bf", isSuper: false },
  { id: 12, name: "Ricardo Coelho",     avatar: "RC",  color: "#fb7185", isSuper: false },
  { id: 13, name: "Rui Santos",         avatar: "RS",  color: "#facc15", isSuper: false },
  { id: 14, name: "Supervisor",         avatar: "SV",  color: "#ffffff", isSuper: true  },
];

// User passwords — change these as needed
const USER_PASSWORDS: Record<number, string> = {
  1:  "3j7F9V", //Beatriz
  2:  "a8W8W3", //Claudia
  3:  "78x2JS", //Elisabete
  4:  "9v9p0E", //Eva
  5:  "N0Yl13", //João Santos
  6:  "O4l0r1", //João Silva
  7:  "96g6Kw", //Liane
  8:  "IY889g", //Luis
  9:  "45Fx8I", //Miguel
  10: "64J2kJ", //Nuno
  11: "6Q48Hx", //Ricardo Anderson
  12: "Yoy096", //Ricardo Coelho
  13: "1Z8tk8", //Rui
  14: "Telma_OM92", // Supervisor password
};

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes — change this value to adjust

const MONTHLY_BALANCE = 7;
const MAX_PER_DAY = 5;
const MAX_DAYS_AHEAD = 30;
const FERIAS_ID = -99;
const BAIXA_ID  = -98;

const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth();

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DAYS_PT = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

type AuditEntry = {
  id: string;
  userId: number;
  userName: string;
  action: "book" | "cancel" | "super_assign" | "super_remove" | "ferias_add" | "ferias_remove" | "baixa_add" | "baixa_remove";
  targetDate: string;
  targetUserName?: string;
  timestamp: Date;
};

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin, idleLoggedOut }: { onLogin: (user: typeof TEAM[0]) => void; idleLoggedOut?: boolean }) {
  const [selected, setSelected] = useState<typeof TEAM[0] | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const handleSelect = (user: typeof TEAM[0]) => {
    setSelected(user);
    setPassword("");
    setError("");
  };

  const handleLogin = () => {
    if (!selected) return;
    if (password === USER_PASSWORDS[selected.id]) {
      onLogin(selected);
    } else {
      setError("Password incorreta. Tenta de novo.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0f",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      color: "#e8e8f0",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background decorative blobs */}
      <div style={{
        position: "absolute", top: -120, left: -120, width: 400, height: 400,
        borderRadius: "50%",
        background: "radial-gradient(circle, #6366f130 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: -80, right: -80, width: 320, height: 320,
        borderRadius: "50%",
        background: "radial-gradient(circle, #8b5cf630 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32, margin: "0 auto 16px",
          boxShadow: "0 0 40px #6366f140",
        }}>🏠</div>
        <div style={{ fontWeight: 800, fontSize: 26, letterSpacing: "-0.5px" }}>HomeOffice Manager</div>
        <div style={{ color: "#4b5563", fontSize: 14, marginTop: 4 }}>Seleciona o teu perfil para continuar</div>
      </div>

      {/* Idle session expired banner */}
      {idleLoggedOut && (
        <div style={{
          marginBottom: 20,
          padding: "12px 20px",
          borderRadius: 10,
          background: "#f59e0b18",
          border: "1px solid #f59e0b40",
          color: "#f59e0b",
          fontSize: 13,
          fontWeight: 500,
          textAlign: "center",
          maxWidth: 400,
          width: "100%",
        }}>
          ⏱️ Sessão terminada por inatividade. Faz login novamente.
        </div>
      )}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
        gap: 10,
        width: "100%",
        maxWidth: 700,
        marginBottom: 28,
      }}>
        {TEAM.map(u => (
          <button key={u.id} onClick={() => handleSelect(u)} style={{
            padding: "14px 10px",
            borderRadius: 12,
            border: selected?.id === u.id ? `2px solid ${u.color}` : "2px solid #ffffff0f",
            background: selected?.id === u.id ? `${u.color}18` : "#ffffff06",
            cursor: "pointer",
            transition: "all 0.18s",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            boxShadow: selected?.id === u.id ? `0 0 18px ${u.color}30` : "none",
            outline: "none",
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: u.color,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 13,
              color: u.isSuper ? "#000" : "#fff",
              boxShadow: selected?.id === u.id ? `0 0 12px ${u.color}70` : "none",
            }}>{u.avatar}</div>
            <span style={{
              fontSize: 12, fontWeight: 600, color: selected?.id === u.id ? "#e8e8f0" : "#9ca3af",
              textAlign: "center", lineHeight: 1.3,
            }}>{u.name}</span>
          </button>
        ))}
      </div>

      {/* Password panel */}
      {selected && (
        <div style={{
          width: "100%", maxWidth: 340,
          background: "#111118",
          border: `1px solid ${selected.color}30`,
          borderRadius: 16,
          padding: "24px",
          boxShadow: `0 0 40px ${selected.color}15`,
          animation: shake ? "shake 0.4s ease" : "slideUp 0.2s ease",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: selected.color,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 13,
              color: selected.isSuper ? "#000" : "#fff",
            }}>{selected.avatar}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{selected.name}</div>
              <div style={{ fontSize: 12, color: "#4b5563" }}>Introduz a tua password</div>
            </div>
          </div>

          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(""); }}
            onKeyDown={handleKeyDown}
            placeholder="Password..."
            autoFocus
            style={{
              width: "100%",
              background: "#ffffff08",
              border: error ? "1.5px solid #ef4444" : "1.5px solid #ffffff15",
              borderRadius: 10,
              padding: "11px 14px",
              color: "#e8e8f0",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
              transition: "border 0.2s",
            }}
          />

          {error && (
            <div style={{ color: "#ef4444", fontSize: 12, marginTop: 8, fontWeight: 500 }}>
              {error}
            </div>
          )}

          <button onClick={handleLogin} style={{
            marginTop: 14,
            width: "100%",
            padding: "12px",
            borderRadius: 10,
            border: "none",
            background: `linear-gradient(135deg, ${selected.color}, ${selected.color}bb)`,
            color: selected.isSuper ? "#000" : "#fff",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            transition: "opacity 0.2s",
          }}>
            Entrar →
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-5px); }
          80%       { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}

// ─── CANCEL CONFIRMATION DIALOG ───────────────────────────────────────────────
function CancelDialog({
  day, month, year, onConfirm, onCancel, color,
}: {
  day: number; month: number; year: number;
  onConfirm: () => void; onCancel: () => void;
  color: string;
}) {
  const dateStr = `${day} de ${MONTHS_PT[month]} de ${year}`;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "#00000080",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
      backdropFilter: "blur(4px)",
      animation: "fadeOverlay 0.15s ease",
    }}>
      <div style={{
        background: "#16161f",
        border: `1px solid #ffffff15`,
        borderRadius: 16,
        padding: "28px 28px 24px",
        maxWidth: 360,
        width: "100%",
        boxShadow: "0 24px 64px #00000080",
        animation: "popIn 0.2s ease",
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🏠</div>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Cancelar reserva?</div>
        <div style={{ color: "#9ca3af", fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
          Tens a certeza que queres remover o teu dia de HO em{" "}
          <span style={{ color: "#e8e8f0", fontWeight: 600 }}>{dateStr}</span>?
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: "11px", borderRadius: 10,
            border: "1.5px solid #ffffff15", background: "transparent",
            color: "#9ca3af", fontWeight: 600, fontSize: 14, cursor: "pointer",
          }}>Manter</button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: "11px", borderRadius: 10,
            border: "none", background: "#ef4444",
            color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}>Cancelar dia</button>
        </div>
      </div>
      <style>{`
        @keyframes fadeOverlay { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.92) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

const ACTION_LABELS: Record<AuditEntry["action"], { label: string; emoji: string; color: string }> = {
  book:          { label: "Reservou",          emoji: "🏠", color: "#10b981" },
  cancel:        { label: "Cancelou",          emoji: "✖️", color: "#ef4444" },
  super_assign:  { label: "Atribuiu (Sup.)",   emoji: "⭐", color: "#6366f1" },
  super_remove:  { label: "Removeu (Sup.)",    emoji: "⭐", color: "#f43f5e" },
  ferias_add:    { label: "Adicionou férias",  emoji: "🏖️", color: "#f59e0b" },
  ferias_remove: { label: "Removeu férias",    emoji: "🏖️", color: "#b45309" },
  baixa_add:     { label: "Adicionou baixa",   emoji: "🤒", color: "#fb923c" },
  baixa_remove:  { label: "Removeu baixa",     emoji: "🤒", color: "#92400e" },
};

function HistoryView({
  auditLog,
  auditFilter,
  setAuditFilter,
}: {
  auditLog: AuditEntry[];
  auditFilter: "all" | number;
  setAuditFilter: (v: "all" | number) => void;
}) {
  // Default selected date = today in YYYY-MM-DD
  const todayStr = today.toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Get all unique booking dates that have audit entries, for the "has entries" indicator
  const datesWithEntries = useMemo(() => {
    const s = new Set<string>();
    auditLog.forEach(e => s.add(e.targetDate));
    return s;
  }, [auditLog]);

  // Filter by selected booking date (targetDate) and optional user filter
  const filtered = useMemo(() => {
    return auditLog.filter(e => {
      if (e.targetDate !== selectedDate) return false;
      if (auditFilter === "all") return true;
      return (
        e.userId === auditFilter ||
        (e.targetUserName && TEAM.find(t => t.id === auditFilter)?.name === e.targetUserName)
      );
    });
  }, [auditLog, selectedDate, auditFilter]);

  const formatTimestamp = (d: Date) =>
    d.toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const formatTargetDate = (s: string) => {
    const [y, m, day] = s.split("-");
    return `${day}/${m}/${y}`;
  };

  const formatSelectedDate = (s: string) => {
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  };

  // Navigate dates
  const shiftDate = (delta: number) => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  return (
    <div style={{ padding: "16px 24px 32px" }}>

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#9ca3af" }}>
          Histórico de alterações
        </div>

        {/* User filter */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Utilizador:</span>
          <button onClick={() => setAuditFilter("all")} style={{
            padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700,
            background: auditFilter === "all" ? "#ffffff30" : "#ffffff10", color: "#fff",
          }}>Todos</button>
          {TEAM.filter(u => !u.isSuper).map(u => (
            <button key={u.id} onClick={() => setAuditFilter(auditFilter === u.id ? "all" : u.id)} style={{
              padding: "4px 8px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700,
              background: auditFilter === u.id ? u.color : "#ffffff10",
              color: auditFilter === u.id ? "#000" : "#fff",
            }}>{u.avatar}</button>
          ))}
        </div>
      </div>

      {/* Date picker row */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, marginBottom: 20,
        background: "#ffffff06", border: "1px solid #ffffff0f",
        borderRadius: 12, padding: "12px 16px",
      }}>
        <button onClick={() => shiftDate(-1)} style={{
          background: "#ffffff10", border: "none", color: "#fff",
          width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 16, flexShrink: 0,
        }}>‹</button>

        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={{
              background: "#ffffff10", border: "1px solid #ffffff20",
              borderRadius: 8, padding: "6px 10px",
              color: "#e8e8f0", fontSize: 13, fontFamily: "inherit",
              cursor: "pointer", outline: "none",
            }}
          />
          <div style={{ fontSize: 14, fontWeight: 700, color: "#e8e8f0" }}>
            {formatSelectedDate(selectedDate)}
            {selectedDate === todayStr && (
              <span style={{ marginLeft: 8, fontSize: 11, background: "#6366f130", color: "#818cf8", borderRadius: 5, padding: "2px 7px" }}>hoje</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            {datesWithEntries.has(selectedDate)
              ? <span style={{ color: "#10b981" }}>● {filtered.length} registo{filtered.length !== 1 ? "s" : ""}</span>
              : <span style={{ color: "#4b5563" }}>Sem registos</span>
            }
          </div>
        </div>

        <button
          onClick={() => shiftDate(1)}
          style={{
            background: "#ffffff10", border: "none", color: "#fff",
            width: 32, height: 32, borderRadius: 8,
            cursor: "pointer", fontSize: 16, flexShrink: 0,
          }}>›</button>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div style={{ color: "#4b5563", fontSize: 14, fontStyle: "italic", textAlign: "center", marginTop: 40 }}>
          Nenhuma alteração registada para este dia.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map(entry => {
            const meta = ACTION_LABELS[entry.action];
            const actor = TEAM.find(t => t.id === entry.userId);
            return (
              <div key={entry.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                background: "#ffffff05", border: "1px solid #ffffff08",
                borderRadius: 10, padding: "10px 14px",
                borderLeft: `3px solid ${meta.color}`,
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                  background: actor?.color ?? "#6b7280",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700, color: "#fff",
                }}>{actor?.avatar ?? "?"}</div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span>{entry.userName}</span>
                    <span style={{
                      fontSize: 11, background: `${meta.color}20`, color: meta.color,
                      borderRadius: 5, padding: "1px 6px",
                    }}>{meta.emoji} {meta.label}</span>
                    {entry.targetUserName && (
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>→ {entry.targetUserName}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <span>
                      Alteração feita em: <span style={{ color: "#e8e8f0", fontWeight: 600 }}>{formatTimestamp(entry.timestamp)}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function HomeOfficeApp() {
  const [loggedInUser, setLoggedInUser] = useState<typeof TEAM[0] | null>(null);
  const [currentUser, setCurrentUser] = useState(TEAM[0]);
  const [viewMonth, setViewMonth] = useState(currentMonth);
  const [viewYear, setViewYear] = useState(currentYear);
  const [bookings, setBookings] = useState<Record<string, number[]>>({});
  const [view, setView] = useState("calendar");
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [selectedUserForAdmin, setSelectedUserForAdmin] = useState(TEAM[0]);
  const [feriasCont, setFeriasCont] = useState<number | null>(null);
  const [baixaCont,  setBaixaCont]  = useState<number | null>(null);
  // Cancel confirmation dialog state
  const [cancelDialog, setCancelDialog] = useState<{ day: number } | null>(null);

  // Audit log
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [auditFilter, setAuditFilter] = useState<"all" | number>("all");

  useEffect(() => {
    if (!loggedInUser?.isSuper) return;
    const q = query(collection(db, "auditLog"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const entries: AuditEntry[] = snap.docs
        .map(d => {
          const data = d.data();
          // serverTimestamp() is null on the first local write — fall back to clientDate
          const ts = data.timestamp?.toDate()
            ?? (data.clientDate ? new Date(data.clientDate) : null);
          if (!ts) return null;
          return { id: d.id, ...data, timestamp: ts } as AuditEntry;
        })
        .filter(Boolean) as AuditEntry[];
      setAuditLog(entries);
    });
    return () => unsub();
  }, [loggedInUser]);

  const [idleLoggedOut, setIdleLoggedOut] = useState(false);

  // Once logged in, set currentUser
  const handleLogin = (user: typeof TEAM[0]) => {
    setLoggedInUser(user);
    setCurrentUser(user);
  };

  const handleLogout = (reason?: "idle") => {
    setLoggedInUser(null);
    if (reason === "idle") {
      setIdleLoggedOut(true);
    }
  };

  // ── Idle timeout: logout after IDLE_TIMEOUT_MS of inactivity ──────────────
  useEffect(() => {
    if (!loggedInUser || loggedInUser.isSuper) return;

    let timer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setLoggedInUser(null);
        setIdleLoggedOut(true);
      }, IDLE_TIMEOUT_MS);
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [loggedInUser]);
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const ref = doc(db, "bookings", "all");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setBookings(snap.data() as Record<string, number[]>);
      }
    });
    return () => unsub();
  }, []);

  const saveBookings = async (newBookings: Record<string, number[]>) => {
    const ref = doc(db, "bookings", "all");
    await setDoc(ref, newBookings);
  };

  const writeAudit = async (
    action: AuditEntry["action"],
    targetDate: string,
    targetUserName?: string,
  ) => {
    // Store a clientDate string as backup in case serverTimestamp is null on first read
    const clientDate = new Date().toISOString();
    await addDoc(collection(db, "auditLog"), {
      userId: currentUser.id,
      userName: currentUser.name,
      action,
      targetDate,
      targetUserName: targetUserName ?? null,
      timestamp: serverTimestamp(),
      clientDate,
    });
  };

  const showToast = (msg: string, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getKey = (year: number, month: number, day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const getUserBookingsThisMonth = (userId: number) => {
    return Object.entries(bookings).filter(([key, users]) => {
      const [y, m] = key.split("-");
      return parseInt(y) === viewYear &&
        parseInt(m) === viewMonth + 1 &&
        (users.includes(userId) || users.includes(-userId));
    }).length;
  };

  const getDayBookings = (day: number) => {
    const key = getKey(viewYear, viewMonth, day);
    return bookings[key] || [];
  };

  const isTooFarAhead = (day: number) => {
    const dateObj = new Date(viewYear, viewMonth, day);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + MAX_DAYS_AHEAD);
    return dateObj > maxDate;
  };

  // Perform the actual removal (called after confirmation)
  const performRemoveBooking = async (day: number) => {
    const key = getKey(viewYear, viewMonth, day);
    const dayBookings = [...(bookings[key] || [])];
    const newBookings = { ...bookings, [key]: dayBookings.filter(id => id !== currentUser.id) };
    setBookings(newBookings);
    await saveBookings(newBookings);
    await writeAudit("cancel", key);
    showToast("Reserva cancelada.");
  };

  const toggleBooking = async (day: number) => {
    const key = getKey(viewYear, viewMonth, day);
    const dayBookings = [...(bookings[key] || [])];
    const dateObj = new Date(viewYear, viewMonth, day);

    if (dateObj.getDay() === 0 || dateObj.getDay() === 6) return;
    if (dateObj < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
      showToast("Não podes alterar dias passados.", "error");
      return;
    }

    // --- SUPERVISOR LOGIC ---
    if (currentUser.isSuper) {
      if (feriasCont !== null) {
        const currentFeriasOnDay = dayBookings.filter(id => id === FERIAS_ID).length;
        if (currentFeriasOnDay > 0) {
          const newDayBookings = dayBookings.filter(id => id !== FERIAS_ID);
          const newBookings = { ...bookings, [key]: newDayBookings };
          setBookings(newBookings);
          await saveBookings(newBookings);
          await writeAudit("ferias_remove", key);
          showToast("Férias removidas deste dia.");
        } else {
          const newDayBookings = [...dayBookings, ...Array(feriasCont).fill(FERIAS_ID)];
          const newBookings = { ...bookings, [key]: newDayBookings };
          setBookings(newBookings);
          await saveBookings(newBookings);
          await writeAudit("ferias_add", key);
          showToast(`${feriasCont} dia(s) de férias adicionado(s). 🏖️`);
        }
        return;
      }

      if (baixaCont !== null) {
        const currentBaixaOnDay = dayBookings.filter(id => id === BAIXA_ID).length;
        if (currentBaixaOnDay > 0) {
          const newDayBookings = dayBookings.filter(id => id !== BAIXA_ID);
          const newBookings = { ...bookings, [key]: newDayBookings };
          setBookings(newBookings);
          await saveBookings(newBookings);
          await writeAudit("baixa_remove", key);
          showToast("Baixa removida deste dia.");
        } else {
          const newDayBookings = [...dayBookings, ...Array(baixaCont).fill(BAIXA_ID)];
          const newBookings = { ...bookings, [key]: newDayBookings };
          setBookings(newBookings);
          await saveBookings(newBookings);
          await writeAudit("baixa_add", key);
          showToast(`${baixaCont} dia(s) de baixa adicionado(s). 🤒`);
        }
        return;
      }

      const targetId = selectedUserForAdmin.id;
      const existingIndex = dayBookings.findIndex(id => Math.abs(id) === targetId);
      if (existingIndex > -1) {
        dayBookings.splice(existingIndex, 1);
        const newBookings = { ...bookings, [key]: dayBookings };
        setBookings(newBookings);
        await saveBookings(newBookings);
        await writeAudit("super_remove", key, selectedUserForAdmin.name);
        showToast(`Removido: ${selectedUserForAdmin.name}`);
      } else {
        const newBookings = { ...bookings, [key]: [...dayBookings, -targetId] };
        setBookings(newBookings);
        await saveBookings(newBookings);
        await writeAudit("super_assign", key, selectedUserForAdmin.name);
        showToast(`Atribuído: ${selectedUserForAdmin.name}`);
      }
      return;
    }

    // --- REGULAR USER LOGIC ---
    const isBookedByUser = dayBookings.includes(currentUser.id);
    const isBookedBySuper = dayBookings.includes(-currentUser.id);

    if (isBookedBySuper) {
      showToast("Este dia foi marcado pelo Supervisor e não pode ser removido.", "error");
      return;
    }

    if (isBookedByUser) {
      setCancelDialog({ day });
      return;
    }

    // Book the day
    if (isTooFarAhead(day)) { showToast(`Limite de ${MAX_DAYS_AHEAD} dias.`, "error"); return; }
    if (getUserBookingsThisMonth(currentUser.id) >= MONTHLY_BALANCE) { showToast("Saldo esgotado!", "error"); return; }
    if (dayBookings.length >= MAX_PER_DAY) { showToast("Dia cheio!", "error"); return; }
    const newBookings = { ...bookings, [key]: [...dayBookings, currentUser.id] };
    setBookings(newBookings);
    await saveBookings(newBookings);
    await writeAudit("book", key);
    showToast("Dia reservado! 🏠");
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [viewYear, viewMonth, daysInMonth, firstDay]);

  const exportToExcel = () => {
    const rows: string[] = [];
    rows.push("Mês;Agente;Total Dias;Dias pelo Utilizador;Dias pelo Supervisor");
    const months = [...new Set(Object.keys(bookings).map(k => k.slice(0, 7)))].sort();
    months.forEach(monthKey => {
      const [y, m] = monthKey.split("-");
      const monthName = `${MONTHS_PT[parseInt(m) - 1]} ${y}`;
      TEAM.filter(u => !u.isSuper).forEach(u => {
        const daysForUser = Object.entries(bookings).filter(([key, users]) => {
          return key.startsWith(monthKey) && (users.includes(u.id) || users.includes(-u.id));
        });
        const totalDays = daysForUser.length;
        if (totalDays === 0) return;
        const superDays = daysForUser.filter(([, users]) => users.includes(-u.id)).length;
        const userDays = totalDays - superDays;
        rows.push(`${monthName};${u.name};${totalDays};${userDays};${superDays}`);
      });
    });
    const csvContent = "\uFEFF" + rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `HO_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const usedBalance = getUserBookingsThisMonth(currentUser.id);
  const remaining = MONTHLY_BALANCE - usedBalance;

  // Show login page if not logged in
  if (!loggedInUser) {
    return <LoginPage onLogin={(user) => { setIdleLoggedOut(false); handleLogin(user); }} idleLoggedOut={idleLoggedOut} />;
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f0f13",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      color: "#e8e8f0",
    }}>
      {/* Cancel confirmation dialog */}
      {cancelDialog && (
        <CancelDialog
          day={cancelDialog.day}
          month={viewMonth}
          year={viewYear}
          color={currentUser.color}
          onConfirm={() => {
            const day = cancelDialog.day;
            setCancelDialog(null);
            performRemoveBooking(day);
          }}
          onCancel={() => setCancelDialog(null)}
        />
      )}

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        borderBottom: "1px solid #ffffff10",
        padding: "20px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>🏠</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.5px" }}>HomeOffice Manager</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Gestão de trabalho remoto</div>
          </div>
        </div>

        {/* Logout button */}
        <button onClick={handleLogout} style={{
          padding: "8px 16px", borderRadius: 8,
          border: "1.5px solid #ffffff15", background: "transparent",
          color: "#9ca3af", fontWeight: 600, fontSize: 13, cursor: "pointer",
          transition: "all 0.2s",
        }}>
          ← Sair
        </button>
      </div>

      {/* Current user bar */}
      <div style={{
        background: `linear-gradient(90deg, ${currentUser.color}20, transparent)`,
        borderBottom: "1px solid #ffffff08",
        padding: "12px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: currentUser.color, display: "flex", alignItems: "center",
            justifyContent: "center", fontWeight: 700, fontSize: 12,
            color: currentUser.isSuper ? "#000" : "#fff",
          }}>{currentUser.avatar}</div>
          <span style={{ fontWeight: 600 }}>{currentUser.name}</span>
          {currentUser.isSuper && (
            <span style={{ fontSize: 11, background: "#ffffff20", borderRadius: 6, padding: "2px 8px", color: "#fff" }}>⭐ Supervisor</span>
          )}
        </div>

        {currentUser.isSuper ? (
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "#9ca3af" }}>Atribuir HO para:</span>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {TEAM.filter(u => !u.isSuper).map(u => (
                  <button key={u.id} onClick={() => {
                    setSelectedUserForAdmin(u);
                    setFeriasCont(null);
                    setBaixaCont(null);
                  }} style={{
                    padding: "4px 8px", borderRadius: 6, border: "none", cursor: "pointer",
                    background: selectedUserForAdmin.id === u.id && feriasCont === null && baixaCont === null ? u.color : "#ffffff15",
                    color: selectedUserForAdmin.id === u.id && feriasCont === null && baixaCont === null ? "#000" : "#fff",
                    fontSize: 11, fontWeight: 700, transition: "0.2s",
                  }}>{u.avatar}</button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, borderLeft: "1px solid #ffffff15", paddingLeft: 16 }}>
              <span style={{ fontSize: 13, color: "#9ca3af" }}>🏖️ Férias:</span>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => {
                  setFeriasCont(feriasCont === n ? null : n);
                  setBaixaCont(null);
                }} style={{
                  width: 30, height: 30, borderRadius: 8, border: "none", cursor: "pointer",
                  background: feriasCont === n ? "#f59e0b" : "#ffffff15",
                  color: feriasCont === n ? "#000" : "#fff",
                  fontWeight: 700, fontSize: 13,
                }}>{n}</button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, borderLeft: "1px solid #ffffff15", paddingLeft: 16 }}>
              <span style={{ fontSize: 13, color: "#9ca3af" }}>🤒 Baixa:</span>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => {
                  setBaixaCont(baixaCont === n ? null : n);
                  setFeriasCont(null);
                }} style={{
                  width: 30, height: 30, borderRadius: 8, border: "none", cursor: "pointer",
                  background: baixaCont === n ? "#ef4444" : "#ffffff15",
                  color: "#fff",
                  fontWeight: 700, fontSize: 13,
                }}>{n}</button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: currentUser.color }}>{remaining}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>dias restantes</div>
            </div>
            <div style={{ width: 1, height: 32, background: "#ffffff10" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{usedBalance}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>usados</div>
            </div>
            <div style={{ width: 1, height: 32, background: "#ffffff10" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#6b7280" }}>{MONTHLY_BALANCE}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>total/mês</div>
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {!currentUser.isSuper && (
        <div style={{ padding: "0 24px", background: "#0f0f13" }}>
          <div style={{ height: 4, background: "#ffffff10", borderRadius: 4, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${(usedBalance / MONTHLY_BALANCE) * 100}%`,
              background: remaining <= 2
                ? "linear-gradient(90deg, #ef4444, #f87171)"
                : `linear-gradient(90deg, ${currentUser.color}, ${currentUser.color}99)`,
              borderRadius: 4, transition: "all 0.4s ease",
            }} />
          </div>
        </div>
      )}

      {/* View toggle */}
      <div style={{ padding: "16px 24px 0", display: "flex", gap: 8, alignItems: "center" }}>
        {["calendar", "team", ...(currentUser.isSuper ? ["history"] : [])].map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer",
            background: view === v ? currentUser.color : "#ffffff10",
            color: view === v && currentUser.isSuper ? "#000" : "#fff",
            fontWeight: 600, fontSize: 13, transition: "all 0.2s",
          }}>
            {v === "calendar" ? "📅 Calendário" : v === "team" ? "👥 Equipa" : "📋 Histórico"}
          </button>
        ))}
        {currentUser.isSuper && (
          <button onClick={exportToExcel} style={{
            padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer",
            background: "#22c55e", color: "#000",
            fontWeight: 600, fontSize: 13, marginLeft: "auto",
          }}>📊 Exportar Excel</button>
        )}
      </div>

      {view === "calendar" && (
        <div style={{ padding: "16px 24px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <button onClick={prevMonth} style={{ background: "#ffffff10", border: "none", color: "#fff", width: 36, height: 36, borderRadius: 8, cursor: "pointer", fontSize: 16 }}>‹</button>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{MONTHS_PT[viewMonth]} {viewYear}</div>
            <button onClick={nextMonth} style={{ background: "#ffffff10", border: "none", color: "#fff", width: 36, height: 36, borderRadius: 8, cursor: "pointer", fontSize: 16 }}>›</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
            {DAYS_PT.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 11, color: "#6b7280", fontWeight: 600, padding: "4px 0" }}>{d}</div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {calendarDays.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const dateObj = new Date(viewYear, viewMonth, day);
              const dayOfWeek = dateObj.getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              const isPast = dateObj < new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const isToday = day === today.getDate() && viewMonth === currentMonth && viewYear === currentYear;
              const dayUsers = getDayBookings(day);
              const isBookedByMe = currentUser.isSuper
                ? false
                : (dayUsers.includes(currentUser.id) || dayUsers.includes(-currentUser.id));
              const isFull = dayUsers.length >= MAX_PER_DAY;
              const tooFar = !currentUser.isSuper && isTooFarAhead(day);
              const isDisabled = isWeekend || isPast || tooFar;

              return (
                <div key={day} onClick={() => !isDisabled && toggleBooking(day)} style={{
                  minHeight: 72, borderRadius: 10, padding: "8px 6px",
                  background: isBookedByMe ? `${currentUser.color}25` : isToday ? "#ffffff08" : isWeekend ? "transparent" : "#ffffff05",
                  border: isBookedByMe ? `1.5px solid ${currentUser.color}60` : isToday ? "1.5px solid #ffffff20" : "1.5px solid transparent",
                  cursor: isDisabled ? "default" : "pointer",
                  opacity: isDisabled ? 0.35 : 1,
                  transition: "all 0.15s", position: "relative",
                }}>
                  <div style={{
                    fontSize: 12, fontWeight: isToday ? 800 : 600,
                    color: isToday ? currentUser.color : "#e8e8f0",
                    marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    {day}
                    {isFull && !currentUser.isSuper && <span style={{ fontSize: 9, background: "#ef444420", color: "#ef4444", borderRadius: 4, padding: "1px 4px" }}>FULL</span>}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                    {(() => {
                      const feriasCount = dayUsers.filter(id => id === FERIAS_ID).length;
                      const baixaCount  = dayUsers.filter(id => id === BAIXA_ID).length;
                      const regularEntries = dayUsers.filter(id => id !== FERIAS_ID && id !== BAIXA_ID);
                      const seenIds = new Set<number>();
                      const uniqueEntries = regularEntries.filter(uid => {
                        const absId = Math.abs(uid);
                        if (seenIds.has(absId)) return false;
                        seenIds.add(absId);
                        return true;
                      });
                      return (
                        <>
                          {uniqueEntries.map(uid => {
                            const u = TEAM.find(t => t.id === Math.abs(uid));
                            const isLocked = uid < 0;
                            return u ? (
                              <div key={uid} title={isLocked ? `${u.name} (Supervisor)` : u.name} style={{
                                width: 18, height: 18, borderRadius: "50%",
                                background: u.color, display: "flex", alignItems: "center",
                                justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#fff",
                                border: Math.abs(uid) === currentUser.id ? "1.5px solid #fff" : "none",
                                position: "relative",
                              }}>
                                {u.avatar[0]}
                                {isLocked && <div style={{ position: "absolute", top: -2, right: -2, fontSize: 7 }}>⭐</div>}
                              </div>
                            ) : null;
                          })}
                          {feriasCount > 0 && (
                            <div title={`Férias ×${feriasCount}`} style={{
                              height: 18, borderRadius: 9, padding: "0 5px",
                              background: "#f59e0b", display: "flex", alignItems: "center",
                              justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#000", gap: 2,
                            }}>🏖️{feriasCount > 1 ? ` ×${feriasCount}` : ""}</div>
                          )}
                          {baixaCount > 0 && (
                            <div title={`Baixa ×${baixaCount}`} style={{
                              height: 18, borderRadius: 9, padding: "0 5px",
                              background: "#ef4444", display: "flex", alignItems: "center",
                              justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#fff", gap: 2,
                            }}>🤒{baixaCount > 1 ? ` ×${baixaCount}` : ""}</div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {dayUsers.length > 0 && (
                    <div style={{ position: "absolute", bottom: 5, left: 6, right: 6 }}>
                      <div style={{ height: 2, background: "#ffffff10", borderRadius: 2 }}>
                        <div style={{
                          height: "100%",
                          width: `${Math.min((dayUsers.length / MAX_PER_DAY) * 100, 100)}%`,
                          background: dayUsers.length >= MAX_PER_DAY ? "#ef4444" : "#10b981",
                          borderRadius: 2,
                        }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280" }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: `${currentUser.color}40`, border: `1.5px solid ${currentUser.color}` }} />
              Os teus dias
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280" }}>
              <div style={{ width: 12, height: 2, background: "#10b981", borderRadius: 2 }} />
              Capacidade disponível
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280" }}>
              <div style={{ width: 12, height: 2, background: "#ef4444", borderRadius: 2 }} />
              Dia cheio
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280" }}>
              <span>🏖️</span> Férias
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280" }}>
              <span>🤒</span> Baixa
            </div>
            {!currentUser.isSuper && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280" }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: "#ffffff30", border: "1px solid #ffffff50" }} />
                Fora do limite de 30 dias
              </div>
            )}
          </div>
        </div>
      )}

      {view === "team" && (
        <div style={{ padding: "16px 24px 32px" }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: "#9ca3af" }}>
            Saldos da Equipa — {MONTHS_PT[viewMonth]} {viewYear}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {TEAM.filter(u => !u.isSuper).map(u => {
              const used = Object.entries(bookings).filter(([key, users]) => {
                const [y, m] = key.split("-");
                return parseInt(y) === viewYear &&
                  parseInt(m) === viewMonth + 1 &&
                  (users.includes(u.id) || users.includes(-u.id));
              }).length;
              const rem = MONTHLY_BALANCE - used;
              const pct = Math.min((used / MONTHLY_BALANCE) * 100, 100);
              return (
                <div key={u.id} style={{ background: "#ffffff05", border: "1px solid #ffffff0a", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: u.color, display: "flex", alignItems: "center",
                        justifyContent: "center", fontWeight: 700, fontSize: 12, color: "#fff",
                      }}>{u.avatar}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>{used} usados · {rem} restantes</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: rem <= 2 ? "#ef4444" : u.color }}>{rem}</div>
                  </div>
                  <div style={{ height: 6, background: "#ffffff10", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${pct}%`,
                      background: rem <= 2 ? "linear-gradient(90deg, #ef4444, #f87171)" : `linear-gradient(90deg, ${u.color}, ${u.color}88)`,
                      borderRadius: 4, transition: "all 0.4s",
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: "#9ca3af" }}>Hoje em HO</div>
            {(() => {
              const todayKey = getKey(currentYear, currentMonth, today.getDate());
              const todayUserIds = bookings[todayKey] || [];
              const feriasToday = todayUserIds.filter(id => id === FERIAS_ID).length;
              const baixaToday  = todayUserIds.filter(id => id === BAIXA_ID).length;
              const seenIds = new Set<number>();
              const regularUsers = todayUserIds
                .filter(id => id !== FERIAS_ID && id !== BAIXA_ID)
                .filter(uid => {
                  const absId = Math.abs(uid);
                  if (seenIds.has(absId)) return false;
                  seenIds.add(absId);
                  return true;
                })
                .map(id => TEAM.find(u => u.id === Math.abs(id)))
                .filter(Boolean) as typeof TEAM;

              return regularUsers.length === 0 && feriasToday === 0 && baixaToday === 0 ? (
                <div style={{ color: "#4b5563", fontSize: 14, fontStyle: "italic" }}>Ninguém em HO hoje.</div>
              ) : (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {regularUsers.map(u => (
                    <div key={u.id} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      background: `${u.color}15`, border: `1px solid ${u.color}40`,
                      borderRadius: 8, padding: "8px 12px",
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", background: u.color,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700,
                      }}>{u.avatar}</div>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</span>
                    </div>
                  ))}
                  {feriasToday > 0 && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      background: "#f59e0b20", border: "1px solid #f59e0b40",
                      borderRadius: 8, padding: "8px 12px",
                    }}>
                      <span style={{ fontSize: 18 }}>🏖️</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Férias ×{feriasToday}</span>
                    </div>
                  )}
                  {baixaToday > 0 && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      background: "#ef444420", border: "1px solid #ef444440",
                      borderRadius: 8, padding: "8px 12px",
                    }}>
                      <span style={{ fontSize: 18 }}>🤒</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Baixa ×{baixaToday}</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── HISTORY VIEW (supervisor only) ─────────────────────────────────── */}
      {view === "history" && currentUser.isSuper && (
        <HistoryView
          auditLog={auditLog}
          auditFilter={auditFilter}
          setAuditFilter={setAuditFilter}
        />
      )}

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: toast.type === "error" ? "#ef4444" : "#10b981",
          color: "#fff", padding: "12px 20px", borderRadius: 10,
          fontWeight: 600, fontSize: 14, boxShadow: "0 8px 32px #00000060",
          zIndex: 999, whiteSpace: "nowrap", animation: "fadeIn 0.2s ease",
        }}>
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
