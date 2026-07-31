# Tutor Earnings Chart — Progress Tracker

Tracks implementation against [tutor-earnings-chart.md](../items/tutor-earnings-chart.md).

---

## Phase T-1 — Implementation ✅ Complete

| # | Item | Status |
|---|---|---|
| 1 | `period` state (6 or 12) added to `TutorWallet` | ✅ |
| 2 | `chartData` derived via `useMemo` — filter EARNING+COMPLETED, group by month, fill gaps | ✅ |
| 3 | Recharts imports added (`ResponsiveContainer`, `BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`) | ✅ |
| 4 | Earnings Trend card inserted between wallet summary and transaction ledger | ✅ |
| 5 | 6M / 12M period toggle | ✅ |
| 6 | Y-axis tick formatter (₦45k / ₦500) | ✅ |
| 7 | Empty-state message when all bars are zero | ✅ |

All changes in `frontend/src/components/TutorWallet.jsx`. No backend changes needed.

---

## Verification Checklist

- [ ] Tutor Wallet page loads → "Earnings Trend" chart card appears between summary and ledger
- [ ] Bars reflect COMPLETED EARNING transactions only (withdrawals and deductions not included)
- [ ] All 6 months shown; months with no earnings show a zero bar (no gap)
- [ ] Toggle 6M ↔ 12M — chart re-renders with correct months
- [ ] Tooltip shows formatted amount on hover
- [ ] No transactions yet → empty-state message shown below the chart
