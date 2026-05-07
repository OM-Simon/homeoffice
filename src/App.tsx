import { useState, useMemo, useEffect } from "react";
import { db } from "./firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

const TEAM = [
  { id: 1,  name: "Beatriz dos Santos",      avatar: "BS", color: "#6366f1", isSuper: false },
  { id: 2,  name: "Cláudia Fortunato",       avatar: "CF", color: "#f59e0b", isSuper: false },
  { id: 3,  name: "Elisabete França",        avatar: "EFr", color: "#10b981", isSuper: false },
  { id: 4,  name: "Eva Fernandes",           avatar: "EFe", color: "#ef4444", isSuper: false },
  { id: 5,  name: "João Santos",             avatar: "JSa", color: "#8b5cf6", isSuper: false },
  { id: 6,  name: "João Silva",              avatar: "JSi", color: "#06b6d4", isSuper: false },
  { id: 7,  name: "Liane Bento",             avatar: "LB", color: "#f43f5e", isSuper: false },
  { id: 8,  name: "Luis Abreu",              avatar: "LA", color: "#84cc16", isSuper: false },
  { id: 9,  name: "Miguel Fonseca",          avatar: "MF", color: "#fb923c", isSuper: false },
  { id: 10, name: "Nuno Lopes",              avatar: "NL", color: "#a78bfa", isSuper: false },
  { id: 11, name: "Ricardo Anderson",        avatar: "RA", color: "#2dd4bf", isSuper: false },
  { id: 12, name: "Ricardo Coelho",          avatar: "RC", color: "#fb7185", isSuper: false },
  { id: 13, name: "Rui Santos",              avatar: "RS", color: "#facc15", isSuper: false },
  { id: 14, name: "Supervisor",              avatar: "SV", color: "#ffffff", isSuper: true  },
];

const SUPER_PASSWORD = "Telma_OM92";



const MONTHLY_BALANCE = 7;
const MAX_PER_DAY = 5;
const MAX_DAYS_AHEAD = 30;

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

export default function HomeOfficeApp() {
  const [currentUser, setCurrentUser] = useState(TEAM[0]);
  const [viewMonth, setViewMonth] = useState(currentMonth);
  const [viewYear, setViewYear] = useState(currentYear);
  const [bookings, setBookings] = useState<Record<string, number[]>>({});
  const [view, setView] = useState("calendar");
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [selectedUserForAdmin, setSelectedUserForAdmin] = useState(TEAM[0]);

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

  const showToast = (msg: string, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getKey = (year: number, month: number, day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const getUserBookingsThisMonth = (userId: number) => {
      return Object.entries(bookings).filter(([key, users]) => {
        const [y, m] = key.split("-");
        // Check for the ID or the negative version of the ID
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
      const targetId = selectedUserForAdmin.id;
      // Check if user is there as positive OR negative
      const existingIndex = dayBookings.findIndex(id => Math.abs(id) === targetId);
  
      if (existingIndex > -1) {
        dayBookings.splice(existingIndex, 1);
        const newBookings = { ...bookings, [key]: dayBookings };
        setBookings(newBookings);
        await saveBookings(newBookings);
        showToast(`Removido: ${selectedUserForAdmin.name}`);
      } else {
        if (dayBookings.length >= MAX_PER_DAY) { showToast("Limite atingido!", "error"); return; }
        // Store as NEGATIVE to mark it as Supervisor-created
        const newBookings = { ...bookings, [key]: [...dayBookings, -targetId] };
        setBookings(newBookings);
        await saveBookings(newBookings);
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
      // User can remove their own booking
      const newBookings = { ...bookings, [key]: dayBookings.filter(id => id !== currentUser.id) };
      setBookings(newBookings);
      await saveBookings(newBookings);
      showToast("Reserva removida.");
    } else {
      // Standard booking constraints
      if (isTooFarAhead(day)) { showToast(`Limite de ${MAX_DAYS_AHEAD} dias.`, "error"); return; }
      if (getUserBookingsThisMonth(currentUser.id) >= MONTHLY_BALANCE) { showToast("Saldo esgotado!", "error"); return; }
      if (dayBookings.length >= MAX_PER_DAY) { showToast("Dia cheio!", "error"); return; }
  
      const newBookings = { ...bookings, [key]: [...dayBookings, currentUser.id] };
      setBookings(newBookings);
      await saveBookings(newBookings);
      showToast("Dia reservado! 🏠");
    }
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

  const usedBalance = getUserBookingsThisMonth(currentUser.id);
  const remaining = MONTHLY_BALANCE - usedBalance;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f0f13",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      color: "#e8e8f0",
      padding: "0",
    }}>
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
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TEAM.map(u => (
            <button key={u.id} onClick={() => {
              if (u.isSuper) {
                const pw = window.prompt("Introduza a password de Supervisor:");
                if (pw === SUPER_PASSWORD) {
                  setCurrentUser(u);
                } else if (pw !== null) {
                  showToast("Password incorreta!", "error");
                }
                // If pw is null (cancelled) or wrong, we do nothing (stays on current user)
              } else {
                setCurrentUser(u);
              }
            }} style={{
              width: 38, height: 38, borderRadius: "50%",
              background: currentUser.id === u.id ? u.color : "#ffffff15",
              border: currentUser.id === u.id ? `2px solid ${u.color}` : "2px solid transparent",
              color: u.isSuper ? "#000" : "#fff", fontWeight: 700, fontSize: 12,
              cursor: "pointer", transition: "all 0.2s",
              boxShadow: currentUser.id === u.id ? `0 0 12px ${u.color}60` : "none", outline: "none",
            }} title={u.name}>{u.avatar}</button>
          ))}
        </div>
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
          <span style={{ color: "#6b7280", fontSize: 13 }}>— a gerir como</span>
          {currentUser.isSuper && (
            <span style={{ fontSize: 11, background: "#ffffff20", borderRadius: 6, padding: "2px 8px", color: "#fff" }}>⭐ Supervisor</span>
          )}
        </div>

        {/* Supervisor entry count selector */}
{/* Supervisor Admin Selector OR User Stats */}
{currentUser.isSuper ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "#9ca3af" }}>Atribuir HO para:</span>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {TEAM.filter(u => !u.isSuper).map(u => (
                <button 
                  key={u.id} 
                  onClick={() => setSelectedUserForAdmin(u)}
                  style={{
                    padding: "4px 8px", borderRadius: 6, border: "none", cursor: "pointer",
                    background: selectedUserForAdmin.id === u.id ? u.color : "#ffffff15",
                    color: selectedUserForAdmin.id === u.id ? "#000" : "#fff",
                    fontSize: 11, fontWeight: 700, transition: "0.2s"
                  }}
                >
                  {u.avatar}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* This was the missing section for regular users */
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

      {/* Progress bar (hidden for supervisor) */}
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

      {/* Balance bar (hidden for supervisor) */}
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
      <div style={{ padding: "16px 24px 0", display: "flex", gap: 8 }}>
        {["calendar", "team"].map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer",
            background: view === v ? currentUser.color : "#ffffff10",
            color: view === v && currentUser.isSuper ? "#000" : "#fff",
            fontWeight: 600, fontSize: 13, transition: "all 0.2s",
          }}>
            {v === "calendar" ? "📅 Calendário" : "👥 Equipa"}
          </button>
        ))}
      </div>

      {view === "calendar" ? (
        <div style={{ padding: "16px 24px 32px" }}>
          {/* Month nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <button onClick={prevMonth} style={{
              background: "#ffffff10", border: "none", color: "#fff",
              width: 36, height: 36, borderRadius: 8, cursor: "pointer", fontSize: 16,
            }}>‹</button>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{MONTHS_PT[viewMonth]} {viewYear}</div>
            <button onClick={nextMonth} style={{
              background: "#ffffff10", border: "none", color: "#fff",
              width: 36, height: 36, borderRadius: 8, cursor: "pointer", fontSize: 16,
            }}>›</button>
          </div>

          {/* Days header */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
            {DAYS_PT.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 11, color: "#6b7280", fontWeight: 600, padding: "4px 0" }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
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
                ? dayUsers.includes(14)
                : dayUsers.includes(currentUser.id);
              const totalSlots = dayUsers.length;
              const isFull = totalSlots >= MAX_PER_DAY && !isBookedByMe;
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
                    {isFull && (
                      <span style={{ fontSize: 9, background: "#ef444420", color: "#ef4444", borderRadius: 4, padding: "1px 4px" }}>FULL</span>
                    )}
                  </div>

                  {/* Avatar dots — deduplicated for display, show count for supervisor */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                    {(() => {
                      const superSlots = dayUsers.filter(id => id === 14).length;
                      const regularIds = [...new Set(dayUsers.filter(id => id !== 14))];
                      return (
                        <>
                          {dayUsers.map(uid => {
  // Use Math.abs to get the real ID regardless of who scheduled it
  const u = TEAM.find(t => t.id === Math.abs(uid));
  const isLocked = uid < 0; // Negative means supervisor scheduled it

  return u ? (
    <div key={uid} title={isLocked ? `${u.name} (Marcado por Supervisor)` : u.name} style={{
      width: 18, height: 18, borderRadius: "50%",
      background: u.color, display: "flex", alignItems: "center",
      justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#fff",
      border: Math.abs(uid) === currentUser.id ? "1.5px solid #fff" : "none",
      position: "relative"
    }}>
      {u.avatar[0]}
      {/* Small dot or icon to show it's locked */}
      {isLocked && <div style={{ position: "absolute", top: -2, right: -2, fontSize: 8 }}>⭐</div>}
    </div>
  ) : null;
})}
                          {superSlots > 0 && (
                            <div title={`Supervisor ×${superSlots}`} style={{
                              height: 18, borderRadius: 9, padding: "0 5px",
                              background: "#ffffff", display: "flex", alignItems: "center",
                              justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#000",
                              border: currentUser.isSuper ? "1.5px solid #fff" : "none",
                              gap: 2,
                            }}>SV{superSlots > 1 ? ` ×${superSlots}` : ""}</div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Capacity bar */}
                  {dayUsers.length > 0 && (
                    <div style={{ position: "absolute", bottom: 5, left: 6, right: 6 }}>
                      <div style={{ height: 2, background: "#ffffff10", borderRadius: 2 }}>
                        <div style={{
                          height: "100%",
                          width: `${(dayUsers.length / MAX_PER_DAY) * 100}%`,
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

          {/* Legend */}
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
            {!currentUser.isSuper && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280" }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: "#ffffff30", border: "1px solid #ffffff50" }} />
                Fora do limite de 30 dias
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ padding: "16px 24px 32px" }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: "#9ca3af" }}>
            Saldos da Equipa — {MONTHS_PT[viewMonth]} {viewYear}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {TEAM.filter(u => !u.isSuper).map(u => {
              const used = Object.entries(bookings).filter(([key, users]) => {
                const [y, m] = key.split("-");
                return parseInt(y) === viewYear && parseInt(m) === viewMonth + 1 && users.includes(u.id);
              }).length;
              const rem = MONTHLY_BALANCE - used;
              const pct = (used / MONTHLY_BALANCE) * 100;
              return (
                <div key={u.id} style={{
                  background: "#ffffff05", border: "1px solid #ffffff0a", borderRadius: 12, padding: "14px 16px",
                }}>
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
              const superCount = todayUserIds.filter(id => id === 14).length;
              const regularUsers = [...new Set(todayUserIds.filter(id => id !== 14))]
                .map(id => TEAM.find(u => u.id === id)).filter(Boolean) as typeof TEAM;
              return regularUsers.length === 0 && superCount === 0 ? (
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
                        width: 28, height: 28, borderRadius: "50%",
                        background: u.color, display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: 11, fontWeight: 700,
                      }}>{u.avatar}</div>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</span>
                    </div>
                  ))}
                  {superCount > 0 && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      background: "#ffffff15", border: "1px solid #ffffff40",
                      borderRadius: 8, padding: "8px 12px",
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: "#ffffff", display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#000",
                      }}>SV</div>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Supervisor ×{superCount}</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
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

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
    </div>
  );
}
