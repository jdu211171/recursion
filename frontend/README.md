# Main page
consists of header and main section
main section contains:
a table with search and filter options and view for displaying hidden columns
a button to add new items
a button to import items
a button to export items
a select dropdown to choose what to display in the table (e.g. loans, items, users, blacklist)
in the loans table (this supposed to show borrowed items with their respective borrowers), there are export button with options to export as CSV or PDF, return button in each row

---

## Loans Table Columns

### 1. Default Visible Columns (core workflow)
* **Item** – Human‑readable title / name of the item (may concatenate short identifier if space permits).
* **Borrower** – Display name of the current borrower (hover or expandable popover can reveal email / ID).
* **Status** – Loan state (Active, Overdue, Returned, Lost, Damaged).
* **Checked Out At** – Timestampz (user’s timezone & format preference).
* **Due Date** – Timestampz; visually highlight approaching or past due (e.g. <=24h amber, overdue red).
* **Time Remaining / Overdue By** – Computed relative duration (e.g. “3d 4h”, or “Overdue 2d”).
* **Actions** – Contextual buttons (Return, Extend/Renew, Blacklist (if staff & overdue), View Details). Export for entire table, not per row (export can be done only by monthly).

### 2. Common Optional Columns (toggle on/off)
* **Organization / Instance** – Multi‑tenant disambiguation (support use only).
* **Additional Item Fields** by default off.
* **Borrower additional fields** by default off.
* **Renewal Count** – Number of successful renewals applied.
* **Max Renewals** – Policy cap (useful for spotting near‑limit loans).
* **Returned At** – Timestampz of completed return “—” if not yet returned.
* **Days Overdue** – Integer or “—” if not overdue (separate from relative string if precision needed).
* **Overdue Fee Accrued** – Computed monetary amount or “—” if not
* **Condition Out** – Assessed condition at checkout (blank until set).
* **Condition In** – Assessed condition at return (blank until set).
* **Last Action By** – Staff user who performed the most recent state change.
* **Notes** - Staff notes.
* **Created At** – System creation Timestampz (rarely needed; mostly auditing).
* **Updated At** – Last modification Timestampz (auditing / troubleshooting).

### 6. Sorting & Filtering Recommendations
Support multi‑column sort (primary: Due Date ascending, secondary: Borrower). Provide quick filters:
* Status chips (Active, Overdue, Returned (session), Lost/Damaged).
* Date range (Checked Out, Due Date).
* Item category

### 7. Export Considerations
CSV / PDF exports include:
* All currently visible columns by default.
* Option to “Include all columns” (even hidden) if role permits.
* Timestampzs exported in ISO 8601 UTC (with user-local formatting only in UI).
* Monetary fields include currency code if multi‑currency potential.

---

## Items Table Columns

### 1. Default Visible Columns (core workflow)
* **Name** - Item name.
* **Available/Total** - Count of available items vs total in collection.
* **Category** - Item category (e.g. Book, Tool, Equipment) “—” if not set.
* **Attachment** - Link to item attachment (e.g. image, document).
* **Notes** - Staff notes.
* **Actions** - Contextual buttons (View (includes Edit), Delete).

# User Settings
### By Default
**Sound cues** for success/error during borrow/return. (Reduces eyes-on-screen time for high-throughput desks.)

### For everyone (account-wide)

* **Profile basics**: Global name, avatar, language, timezone, date/time format, dark mode. (One global account model supports a single identity across Orgs.)
* **Security**: Change password, active sessions (sign out of others).
* **Default Instance** would be the last used Instance before logging out.
* **Disable sound cues** toggle (for those who prefer silence). (Sound cues are on by default, but can be turned off globally.)

### Role add-ons (only if you have the role)
**Admin** decide to enable/disable sound cues for all users in the Org. (Admins can override the global setting for their Org.)
**Staff**: When processing an overdue return (via the Return action), staff can: (a) temporarily blacklist the user until a specified payment is received, (b) extend/override the due date, (c) accept the return with no penalty, (d) apply a time-limited blacklist, or (e) permanently blacklist the user with an accompanying note.
The max number of renewals allowed for a loan.

---
