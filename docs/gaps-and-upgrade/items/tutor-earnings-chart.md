# Tutor Earnings Chart — Findings

Feature #15. The Tutor Wallet page listed transactions as a plain table with no visual summary of earnings over time. A tutor had no way to see whether their income was growing, seasonal, or flat.

Severity: 🟡 UX improvement / missing insight

---

## Finding

| # | Finding | Location | Sev |
|---|---|---|---|
| T-1 | No earnings trend chart — transaction data existed but was only displayed as a table | `components/TutorWallet.jsx` | 🟡 |

---

## Fix

A **monthly earnings bar chart** inserted between the wallet summary cards and the transaction ledger.

### Data derivation
- Source: the existing `transactions` array (already fetched from `/api/payments/tutor/wallet/`)
- Filter: `transaction_type === 'EARNING'` AND `status === 'COMPLETED'`
- Grouping: summed per calendar month (`YYYY-MM` prefix match on `created_at`)
- Range: last 6 or 12 calendar months, including months with zero earnings (no data gaps)
- Computed via `useMemo` — re-derives only when `transactions` or `period` changes

### Period toggle
6M / 12M pill buttons in the card header.

### Chart spec
- Library: recharts (`BarChart` / `Bar` / `XAxis` / `YAxis` / `Tooltip` / `ResponsiveContainer`) — already in the bundle
- Bar size: 28 px, rounded top corners (`radius={[6,6,0,0]}`)
- Y-axis tick formatter: `₦45k` for large values, `₦500` for small
- Tooltip: `₦{n}` formatted with `toLocaleString()`
- Empty state: inline message when all bars are zero (no earnings yet)
- Emerald bar colour consistent with the "Earnings Trend" accent
