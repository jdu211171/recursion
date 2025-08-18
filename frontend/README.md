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
* **Returned At** – Timestampz of completed return "—" if not yet returned.
* **Days Overdue** – Integer or "—" if not overdue (separate from relative string if precision needed).
* **Overdue Fee Accrued** – Computed monetary amount or "—" if not
* **Condition Out** – Assessed condition at checkout (blank until set).
* **Condition In** – Assessed condition at return (blank until set).
* **Last Action By** – Staff user who performed the most recent state change.
* **Notes** - Staff notes.
* **Created At** – System creation Timestampz (rarely needed; mostly auditing).
* **Updated At** – Last modification Timestampz (auditing / troubleshooting).

### 3. Sorting & Filtering Recommendations
Support multi‑column sort (primary: Due Date ascending, secondary: Borrower). Provide quick filters:
* Status chips (Active, Overdue, Returned (session), Lost/Damaged).
* Date range (Checked Out, Due Date).
* Item category

### 4. Export Considerations
CSV / PDF exports include:
* All currently visible columns by default.
* Option to “Include all columns” (even hidden) if role permits.
* Timestampzs exported in ISO 8601 UTC (with user-local formatting only in UI).
* Monetary fields include currency code if multi‑currency potential.

### 5. Return modal with confirmation

### 6. Blacklist Modal
The blacklist modal provides:
* A duration selector: 1 week, 1 month, 3 months, 6 months, 1 year, or Permanent.
* A reason selector: Lost item, Damaged item, Overdue item, or Other (selecting Other reveals a text input for a custom reason).

Additional options:
* Permanent blacklist + A reason selector
* Payment required (input shows up for payment amount) + A reason selector

---

## Items Table Columns

### 1. Default Visible Columns (core workflow)
* **Name** – Primary display name / title.
* **Category** – Classification (Book, Tool, Equipment, etc.) — if unset show "—".
* **Available / Total** – Inventory availability (derived: totalQuantity - activeLoans). Format "7 / 12".
* **Status** – Aggregate status (Available, Unavailable, All Loaned, Retired, Maintenance, Reserved) color coded.
* **Attachments** – Indicator (icon + count) if there are files/images; click opens gallery/panel.
* **Actions** – View (includes Edit), Quick Loan (if role & stock > 0), Retire, Delete (guarded).

### 2. Common Optional Columns (toggle)
* **Custom Fields** – Dynamic fields about the item (key/value pairs).
* **Condition** – Current baseline condition (New, Good, Fair, Poor, Damaged) - if unset show "—".
* **Notes** – Staff notes.
* **Created At**
* **Updated At**

### 3. Export (CSV/PDF) + Import CSV (create or update)
* Includes currently visible columns (option: include all), and be able to export all items or filtered subset.

### 4. Create Form + Edit Form
* **Name** – Required, unique within Org.
* **Category** – Optional, be able to select from predefined list or create new at the spot.
* **Total Quantity** – Required, positive integer.
* **Condition** – Optional, select from predefined list (New, Good, Fair, Poor, Damaged).
* **Attachments** – Optional, upload file/image.
* **Custom Fields** – Optional, key/value pairs (dynamic).
* **Notes** – Optional, text area for staff notes.

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
