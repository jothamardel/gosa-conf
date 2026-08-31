# Implementation Plan - Finance Officer Reconciliation & Requisition Application (`mosaic-next`)

Build a complete Finance Officer Web Application in [mosaic-next](file:///Users/mac/Documents/fleet-managment/mosaic-next) to consolidate transactions from 9+ bank accounts into a unified Master Ledger, analyze cashflows, manage payment requisitions, and auto-reconcile transactions using WhatsApp AI Vision OCR receipt ingestion.

## User Review Required

> [!IMPORTANT]
> **Harmonized Multi-Bank Statement Parser**: The statement ingestion engine features an **Intelligent Column Normalizer** that automatically detects and harmonizes diverse column header names across 9+ bank statement formats (e.g. Zenith, GTBank, Access, FirstBank, UBA, Moniepoint, Kuda, OPay, etc.). Every record is assigned its source `bankName`, `accountNumber`, `transactionDate`, `valueDate`, `description`, `debit`, `credit`, `amount`, `balance`, `reference`, and original raw row data.

> [!NOTE]
> **Authentication**: Simple Email/Password authentication for the Finance Officer will be implemented with protected route middleware and session cookies.

## Proposed Changes

### Database & Authentication Infrastructure

#### [NEW] [db.ts](file:///Users/mac/Documents/fleet-managment/mosaic-next/lib/db.ts)
- Implement cached Mongoose connection handler.

#### [NEW] [User.ts](file:///Users/mac/Documents/fleet-managment/mosaic-next/lib/models/User.ts)
- Finance Officer user schema (`email`, `passwordHash`, `fullName`, `role`).

#### [NEW] [BankAccount.ts](file:///Users/mac/Documents/fleet-managment/mosaic-next/lib/models/BankAccount.ts)
- Bank Account schema for 9+ accounts (`bankName`, `accountNumber`, `accountName`, `branch`, `currency`, `currentBalance`, `isActive`).

#### [NEW] [BankStatementEntry.ts](file:///Users/mac/Documents/fleet-managment/mosaic-next/lib/models/BankStatementEntry.ts)
- Harmonized Master Ledger entry schema:
  - `bankName` (String, required - e.g. "GTBank", "Zenith Bank")
  - `accountNumber` (String, required)
  - `accountName` (String)
  - `transactionDate` (Date, required)
  - `valueDate` (Date)
  - `description` (String, full narration)
  - `debit` (Number, default 0)
  - `credit` (Number, default 0)
  - `amount` (Number, signed net amount: positive for credit, negative for debit)
  - `balance` (Number, running balance)
  - `reference` (String, bank reference / NIP session ID)
  - `category` (String, e.g. "Vendor Payment", "Fleet Fuel", "Transfer")
  - `hash` (String, unique transaction fingerprint for deduplication)
  - `reconciliationStatus` (Enum: `unreconciled`, `matched`, `reconciled`, `flagged`)
  - `rawRowData` (Schema.Types.Mixed, preserves full original row)

#### [NEW] [PaymentRequisition.ts](file:///Users/mac/Documents/fleet-managment/mosaic-next/lib/models/PaymentRequisition.ts)
- Requisition lifecycle schema (`requisitionNo`, `requesterName`, `department`, `vendorName`, `vendorAccount`, `vendorBank`, `amount`, `purpose`, `category`, `targetAccountId`, `status`, `disburseRef`, `approvedBy`).

#### [NEW] [WhatsAppReceipt.ts](file:///Users/mac/Documents/fleet-managment/mosaic-next/lib/models/WhatsAppReceipt.ts)
- Ingested WhatsApp receipt OCR schema (`rawImageUrl`, `senderJid`, `senderName`, `extractedAmount`, `extractedDate`, `extractedRef`, `extractedBank`, `extractedPayee`, `confidenceScore`, `matchedRequisitionId`, `matchedEntryId`).

---

### Authentication System

#### [NEW] [route.ts](file:///Users/mac/Documents/fleet-managment/mosaic-next/app/api/auth/login/route.ts)
#### [NEW] [route.ts](file:///Users/mac/Documents/fleet-managment/mosaic-next/app/api/auth/me/route.ts)
#### [NEW] [route.ts](file:///Users/mac/Documents/fleet-managment/mosaic-next/app/api/auth/logout/route.ts)
- API endpoints for Finance Officer login, session verification, and logout.

#### [MODIFY] [page.tsx](file:///Users/mac/Documents/fleet-managment/mosaic-next/app/\(auth\)/signin/page.tsx)
- Connect existing Sign In template to `/api/auth/login` for Finance Officer authentication.

---

### Ingestion & OCR Services

#### [NEW] [statement-parser.service.ts](file:///Users/mac/Documents/fleet-managment/mosaic-next/lib/services/statement-parser.service.ts)
- **Intelligent Multi-Bank Statement Normalizer**:
  - Automatically maps varied column aliases across 9+ banks:
    - **Date Column Aliases**: `Post Date`, `Txn Date`, `Transaction Date`, `Value Date`, `Val Date`, `Date`, `Effective Date`
    - **Description Aliases**: `Remarks`, `Narration`, `Transaction Details`, `Description`, `Particulars`, `Memo`
    - **Debit/Credit Aliases**: `Debit`, `Credit`, `Withdrawal`, `Deposit`, `Paid Out`, `Paid In`, `Amount`, `DR/CR`
    - **Balance Aliases**: `Balance`, `Running Balance`, `Book Balance`, `Available Balance`
    - **Reference Aliases**: `Ref No`, `Reference`, `Txn Ref`, `Channel Ref`, `NIP Ref`, `Transaction ID`
  - Normalizes date formats (`DD/MM/YYYY`, `YYYY-MM-DD`, `DD-MMM-YYYY`).
  - Computes SHA-256 transaction hash to skip duplicate rows when re-uploading overlapping statements.

#### [NEW] [vision-ocr.service.ts](file:///Users/mac/Documents/fleet-managment/mosaic-next/lib/services/vision-ocr.service.ts)
- AI Vision OCR service calling GPT-4o / Gemini Vision to extract structured transaction details from WhatsApp receipt images and PDFs.

#### [NEW] [reconciliation-matcher.service.ts](file:///Users/mac/Documents/fleet-managment/mosaic-next/lib/services/reconciliation-matcher.service.ts)
- Smart reconciliation matching engine computing confidence scores (0–100%) based on amount match, date proximity, reference code, and payee similarity.

---

### Application API Routes

#### [NEW] [route.ts](file:///Users/mac/Documents/fleet-managment/mosaic-next/app/api/finance/accounts/route.ts)
- Seed and manage 9+ bank accounts.

#### [NEW] [route.ts](file:///Users/mac/Documents/fleet-managment/mosaic-next/app/api/finance/statements/upload/route.ts)
- Handles bank statement file uploads, parses, harmonizes, and compiles into Master Ledger in MongoDB.

#### [NEW] [route.ts](file:///Users/mac/Documents/fleet-managment/mosaic-next/app/api/finance/requisitions/route.ts)
- Create, list, approve, disburse, and manage requisitions.

#### [NEW] [route.ts](file:///Users/mac/Documents/fleet-managment/mosaic-next/app/api/finance/reconciliation/match/route.ts)
- Run smart matching engine and handle manual approval/override reconciliation actions.

---

### Finance UI Components & Pages

#### [NEW] [page.tsx](file:///Users/mac/Documents/fleet-managment/mosaic-next/app/\(default\)/finance/dashboard/page.tsx)
- Finance Executive Dashboard with:
  - KPI Metrics Bar (Total Balance, Total Inflow, Total Outflow, Net Cashflow, Unreconciled Count).
  - 9+ Bank Account Balance Overview Cards.
  - Interactive Chart.js Timeline Charts (Cashflow Trend over daily/weekly/monthly/quarterly timelines, Account Comparison, Category Breakdown).
  - Harmonized Master Ledger Table with multi-filter search (including Bank Name filter).

#### [NEW] [page.tsx](file:///Users/mac/Documents/fleet-managment/mosaic-next/app/\(default\)/finance/statements/page.tsx)
- Bank Statement Upload & Multi-Account Harmonization Workbench.

#### [NEW] [page.tsx](file:///Users/mac/Documents/fleet-managment/mosaic-next/app/\(default\)/finance/requisitions/page.tsx)
- Requisitions Management Table & Creation Modal.

#### [NEW] [page.tsx](file:///Users/mac/Documents/fleet-managment/mosaic-next/app/\(default\)/finance/reconciliation/page.tsx)
- Smart Reconciliation Workbench showing Auto-Reconciled items, Suggested Matches (Confidence Scores), and Manual Matching Override tool.

## Verification Plan

### Automated Verification
- Verify build and TypeScript compilation: `npm run build` in `mosaic-next`.
- Test statement parsing and column harmonization logic with sample CSV/Excel files from multiple banks.

### Manual Verification
- Test Finance Officer login.
- Upload sample bank statements for multiple accounts and verify compilation into Harmonized Master Ledger.
- Create a requisition, disburse, and test AI receipt OCR matching.
