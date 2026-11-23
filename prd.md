Below is a complete, implementation-oriented Product Requirements Document (PRD) for **SmartMoney**, based on the architecture, privacy principles, and eight-screen visual concept we developed.

The document is structured to guide the entire product lifecycle: product design, UX/UI, database architecture, Expo development, AI integration, security, testing, and release.

# SmartMoney — Product Requirements Document (PRD)

**Product:** SmartMoney\
**Tagline:** Your Private AI Finance Companion\
**Platform:** Android & iOS\
**Application Type:** Local-First Personal Finance Management + AI Assistant\
**Frontend:** Expo / React Native / TypeScript\
**Database:** SQLite using `@op-engineering/op-sqlite`\
**Vector Search:** sqlite-vec\
**AI Architecture:** Cloud LLM + Local Tools + Local RAG\
**Primary Market:** Individual consumers\
**Initial Currency:** INR (₹)\
**Document Version:** 1.0\
**Status:** Product Specification

---

# 1. Product Overview

## 1.1 Product Vision

SmartMoney is a privacy-first, local-first personal finance application that helps users track, understand, and manage their finances through a combination of traditional financial management tools and AI-powered financial insights.

Unlike conventional finance applications that depend on cloud databases to store personal financial records, SmartMoney stores financial information directly on the user's device.

The application combines:

- Offline-first transaction management.
- Multiple financial account management.
- Income and expense tracking.
- Budget planning and monitoring.
- Financial analytics and visualizations.
- Receipt and statement importing.
- Semantic transaction search.
- AI-powered financial conversations.
- Local SQL-based financial calculations.
- Privacy-aware AI processing.
- Encrypted backups and restoration.

## 1.2 Core Philosophy

**Your Data, Your Control.**

SmartMoney follows five fundamental principles:

1. Local-first: Financial records are saved on the device before any optional network operation.
2. Privacy-first: Personal financial information should never be uploaded unnecessarily.
3. Offline-capable: Core financial features must work without internet access.
4. AI-assisted: AI helps users understand financial information rather than controlling their money.
5. User-controlled: Financial changes require explicit user actions and confirmation.

## 1.3 Problem Statement

Most personal finance applications have several limitations:

- Financial information is frequently stored on external servers.
- Users must manually categorize and understand transactions.
- Searching old financial records is difficult.
- Budget tracking often requires manual interpretation.
- Financial analytics are presented without conversational explanations.
- AI assistants cannot reliably access structured financial information.
- Offline functionality is limited.
- Users have limited control over how their financial data is processed.

SmartMoney addresses these problems through local financial storage, deterministic financial calculations, and an AI assistant that can interact with approved local tools.

## 1.4 Proposed Solution

SmartMoney uses a hybrid architecture:

**Local Application + Local Database + Optional Cloud AI**

The local application is responsible for:

- Storing financial records.
- Performing financial calculations.
- Managing accounts and budgets.
- Processing receipts and statements.
- Generating embeddings.
- Searching financial records.
- Enforcing permissions and confirmations.

The cloud AI is responsible for:

- Understanding natural-language questions.
- Selecting appropriate tools.
- Explaining financial results.
- Generating structured extraction suggestions.
- Producing conversational financial insights.

The cloud AI never receives direct database access.

---

# 2. Product Goals and Objectives

## 2.1 Primary Goals

| Goal            | Description                                            |
| --------------- | ------------------------------------------------------ |
| Privacy         | Keep financial records on the user's device            |
| Offline support | Support all essential ledger operations offline        |
| Simplicity      | Make expense tracking fast and intuitive               |
| Intelligence    | Provide AI-assisted financial understanding            |
| Accuracy        | Use SQL for financial calculations                     |
| Searchability   | Support keyword and semantic transaction search        |
| Reliability     | Protect financial information against accidental loss  |
| Transparency    | Clearly communicate when information leaves the device |

## 2.2 Success Metrics

Initial product targets:

| Metric                                | Target              |
| ------------------------------------- | ------------------- |
| Manual transaction creation           | Under 5 seconds     |
| Local transaction save                | Under 100 ms target |
| Dashboard loading                     | Under 500 ms target |
| Transaction search                    | Under 500 ms target |
| Offline ledger availability           | 100%                |
| Financial calculation source          | Local SQL           |
| Unconfirmed financial mutations       | 0                   |
| Data loss during normal operations    | 0                   |
| Core functionality requiring internet | 0                   |

These are engineering targets, not guaranteed performance measurements.

## 2.3 Non-Goals

The initial release will NOT provide:

- Direct bank account connectivity.
- Automatic bank transfers.
- UPI payments.
- Bill payments.
- Investment execution.
- Stock trading.
- Credit card payment processing.
- Financial product recommendations.
- Automated financial decisions.
- Multi-user shared financial accounts.
- Server-side storage of complete transaction histories.

These may be evaluated for future releases.

---

# 3. Target Users

## 3.1 Primary Users

### User A — Students

Needs:

- Track daily spending.
- Manage limited monthly budgets.
- Understand where money goes.
- Track subscriptions and recurring expenses.

### User B — Working Professionals

Needs:

- Manage multiple bank accounts.
- Monitor monthly spending.
- Track income and savings.
- Analyze spending patterns.
- Search old transactions.

### User C — Privacy-Conscious Users

Needs:

- Store financial records locally.
- Avoid unnecessary cloud synchronization.
- Protect application access using biometrics.
- Maintain encrypted backups.
- Control AI data sharing.

## 3.2 Primary User Experience

A user should be able to:

1. Open SmartMoney.
2. View their current financial overview.
3. Add an expense in a few seconds.
4. Review spending and budgets.
5. Ask the AI assistant financial questions.
6. Search previous transactions.
7. Import a receipt or statement.
8. Export an encrypted backup.

---

# 4. Application Navigation

The application uses a five-item bottom navigation system.

| Tab       | Purpose                         |
| --------- | ------------------------------- |
| Home      | Financial overview and insights |
| History   | Transaction history             |
| Analytics | Financial reports               |
| Budgets   | Budget management               |
| AI Chat   | Finance Agent                   |

Additional screens are accessed through the profile/settings area and contextual actions.

## 4.1 Navigation Structure

```
SmartMoney
│
├── Authentication
│   ├── Welcome
│   ├── Biometric Unlock
│   └── App Lock
│
├── Main Application
│   ├── Home
│   ├── History
│   ├── Analytics
│   ├── Budgets
│   └── AI Finance Agent
│
├── Transactions
│   ├── Add Transaction
│   ├── Edit Transaction
│   ├── Transaction Details
│   ├── Receipt Scanner
│   └── CSV Import
│
├── Accounts
│   ├── Account List
│   ├── Add Account
│   └── Account Details
│
├── Categories
│   ├── Category List
│   └── Manage Categories
│
├── Settings
│   ├── Security
│   ├── Privacy
│   ├── AI Settings
│   ├── Backup & Restore
│   └── About
│
└── Onboarding
    ├── Welcome
    ├── Privacy Explanation
    ├── Currency Selection
    ├── Account Setup
    └── Dashboard
```

---

# 5. Detailed Functional Requirements

# Module 1 — Onboarding & Authentication

## 5.1 Welcome Screen

Purpose: Introduce SmartMoney and communicate its primary value.

Elements:

- SmartMoney logo.
- Tagline: Your Private AI Finance Companion.
- Privacy-first messaging.
- Get Started button.
- Existing user unlock flow.

## 5.2 Onboarding Flow

The first-time setup includes:

1. Welcome screen.
2. Privacy explanation.
3. Currency selection.
4. Optional account creation.
5. Optional initial balance.
6. Biometric authentication setup.
7. Dashboard.

Default currency: INR (₹).

Users can change the currency in settings.

## 5.3 Biometric Authentication

Requirements:

- Support Face ID where available.
- Support Android fingerprint authentication.
- Provide device credential fallback where supported.
- Allow users to enable or disable biometric locking.
- Lock the application after configured inactivity.
- Require authentication when reopening a locked application.
- Avoid storing biometric information inside the database.

Technology:

- `expo-local-authentication`
- `expo-secure-store`

Important: Secure key material must be protected using platform-supported secure storage. Authentication alone does not encrypt a SQLite database.

---

# Module 2 — Home Dashboard

## 5.4 Dashboard Overview

The dashboard is the primary screen.

It should communicate the user's financial situation immediately.

### Section A — Header

Display:

- Greeting.
- User-selected display name, if configured.
- Current date.
- Profile/settings icon.

### Section B — Total Balance

Display:

- Total account balance.
- Currency.
- Balance visibility toggle.
- Balance change indicator where meaningful.

Formula:

Total Balance = Sum of Account Balances

Account balances must account for transaction history and transfers without double counting.

### Section C — Financial Summary

Three summary cards:

1. Total Spent.
2. Total Income.
3. Net Savings.

Net Savings = Income − Expenses

Display the selected reporting period.

Default: Current Month.

### Section D — Spending Overview

Display:

- Category-wise spending.
- Donut chart.
- Category percentages.
- Total spending.

Example:

| Category | Amount |
| -------- | ------ |
| Food     | ₹3,500 |
| Travel   | ₹2,000 |
| Shopping | ₹1,500 |
| Others   | ₹1,420 |

### Section E — AI Insights

Display contextual insights generated from local financial calculations.

Examples:

- Food spending increased by 20%.
- You have used 70% of your monthly budget.
- Your highest spending category is Food.
- Your spending is lower than last month.

AI-generated explanations must be grounded in available calculations.

### Section F — Recent Transactions

Display the latest five transactions.

Each transaction includes:

- Merchant.
- Category.
- Date.
- Account.
- Amount.
- Income/expense indicator.

### Section G — Quick Actions

- Add Expense.
- Add Income.
- Scan Receipt.
- Ask AI.

## 5.5 Dashboard Interactions

- Tapping Total Balance opens account details.
- Tapping Spending opens filtered transactions.
- Tapping a category opens category transactions.
- Tapping a transaction opens transaction details.
- Tapping AI Insights opens AI Chat with relevant context.

---

# Module 3 — Accounts Management

## 5.6 Account Types

Support:

- Bank Account.
- UPI.
- Cash.
- Credit Card.
- Savings Account.
- Other.

## 5.7 Account Creation

Fields:

| Field           | Required |
| --------------- | -------- |
| Account Name    | Yes      |
| Account Type    | Yes      |
| Initial Balance | Yes      |
| Currency        | Yes      |
| Description     | No       |
| Color/Icon      | No       |

Examples:

- HDFC Savings.
- SBI Account.
- Google Pay UPI.
- Cash Wallet.
- Personal Credit Card.

These are user-defined account labels, not connected financial institutions.

## 5.8 Account Details

Display:

- Account name.
- Account type.
- Current balance.
- Total income.
- Total expenses.
- Recent transactions.

Actions:

- Edit account.
- Archive account.
- View transactions.

Deleting an account with associated transactions must not silently delete financial history.

## 5.9 Account Balance Calculation

For an ordinary cash/bank account:

Current Balance = Initial Balance + Income − Expenses + Transfers In − Transfers Out

Credit card accounts require separate liability accounting.

Transfers must create linked records or a dedicated transfer entity so that moving money between accounts does not count as income or expense.

---

# Module 4 — Transaction Management

## 5.10 Transaction Types

Support:

- Expense.
- Income.
- Transfer.

## 5.11 Add Transaction Screen

This is one of the most important screens.

### Input Fields

| Field            | Required               |
| ---------------- | ---------------------- |
| Amount           | Yes                    |
| Transaction Type | Yes                    |
| Category         | Yes for income/expense |
| Merchant         | No                     |
| Account          | Yes                    |
| Date             | Yes                    |
| Note             | No                     |
| Tags             | No                     |
| Receipt          | No                     |

### Input Methods

Three entry methods:

1. Manual.
2. Receipt.
3. CSV/Statement Import.

### Manual Transaction Example

Amount: ₹1,450

Merchant: Swiggy

Category: Food

Account: HDFC UPI

Date: November 21, 2026

Note: Team lunch

Button: Save Transaction.

## 5.12 Transaction Saving Behavior

The transaction must be saved locally immediately.

Expected flow:

```
User Input
    ↓
Validate Fields
    ↓
SQLite Transaction
    ↓
Update Dashboard
    ↓
Update History
    ↓
Set needs_embedding = 1
    ↓
Optional Embedding Queue
```

No internet connection should be required.

## 5.13 Transaction History

Display:

- Transaction date.
- Merchant.
- Amount.
- Category.
- Account.
- Transaction type.

Features:

- Search.
- Filter by date.
- Filter by account.
- Filter by category.
- Filter by amount.
- Filter by transaction type.
- Sort newest/oldest.
- Monthly grouping.

## 5.14 Transaction Details

Display complete transaction information.

Actions:

- Edit.
- Delete.
- Duplicate.
- Add receipt.
- View related transactions.

Deleting transactions must use a database transaction and update relevant derived data and embeddings.

---

# Module 5 — Categories

## 5.15 Default Expense Categories

- Food.
- Groceries.
- Travel.
- Shopping.
- Entertainment.
- Healthcare.
- Education.
- Bills.
- Rent.
- Transportation.
- Subscriptions.
- Personal Care.
- Others.

## 5.16 Default Income Categories

- Salary.
- Freelance.
- Business.
- Investments.
- Gifts.
- Refunds.
- Others.

## 5.17 Category Management

Users can:

- Create categories.
- Rename categories.
- Change icons.
- Change colors.
- Archive categories.

Archived categories remain available in historical transaction records.

---

# Module 6 — Budget Management

## 5.18 Budget Overview

Display:

- Monthly total budget.
- Total spent.
- Remaining amount.
- Budget utilization percentage.
- Category-wise budgets.

## 5.19 Create Budget

Fields:

- Category.
- Monthly Limit.
- Alert Threshold.
- Start Month.

Example:

Food Budget: ₹4,000

Alert Threshold: 80%.

## 5.20 Budget Monitoring

Calculate:

Budget Utilization = (Spent / Monthly Limit) × 100

Budget Remaining = Monthly Limit − Spent

Alert behavior:

| Utilization   | Status      |
| ------------- | ----------- |
| Below 70%     | Normal      |
| 70–79%        | Approaching |
| 80–99%        | Warning     |
| 100% or above | Exceeded    |

Thresholds should be configurable.

## 5.21 Budget Notifications

Optional local notifications:

- Budget nearing limit.
- Budget exceeded.
- Monthly budget summary.

Notifications must be generated locally from budget calculations.

---

# Module 7 — Financial Analytics

## 5.22 Analytics Dashboard

The analytics module provides a deeper understanding of financial behavior.

### Analytics Sections

1. Spending Overview.
2. Income vs Expense.
3. Category Breakdown.
4. Monthly Trends.
5. Account-wise Spending.
6. Savings Trends.
7. Top Merchants.

## 5.23 Time Filters

Support:

- 1 Month.
- 3 Months.
- 6 Months.
- 1 Year.
- Custom Date Range.

## 5.24 Charts

Use local SQL queries as the source of chart data.

Recommended charts:

| Chart               | Type     |
| ------------------- | -------- |
| Spending Breakdown  | Donut    |
| Monthly Expenses    | Line     |
| Income vs Expenses  | Bar      |
| Budget Utilization  | Progress |
| Category Comparison | Bar      |
| Net Savings         | Line     |

## 5.25 Analytics Accuracy

Financial calculations must use deterministic SQL.

The AI must never independently calculate financial totals from raw transaction descriptions.

---

# Module 8 — AI Finance Agent

## 5.26 Overview

The AI Finance Agent is the primary differentiating feature.

It allows users to communicate with their financial data through natural language.

Example:

"How much did I spend on food this month?"

"Show my biggest expenses in November."

"Where did I spend money on team lunches?"

"Am I spending more than last month?"

"Find the receipt for my Swiggy order."

## 5.27 AI Capabilities

The agent should support:

- Spending summaries.
- Income summaries.
- Monthly comparisons.
- Category analysis.
- Budget status.
- Transaction search.
- Merchant search.
- Receipt discovery.
- Spending pattern explanations.
- Financial question answering.

## 5.28 Agent Architecture

The architecture follows a controlled tool-calling model.

```
User Question
      ↓
Local Application
      ↓
PII / Privacy Policy
      ↓
Cloud LLM
      ↓
Tool Selection
      ↓
Tool Request
      ↓
Local Tool Registry
      ↓
SQLite / sqlite-vec
      ↓
Structured Results
      ↓
Cloud LLM
      ↓
Natural Language Answer
      ↓
User
```

The LLM does not have direct access to SQLite.

## 5.29 Initial Tool Registry

### Tool 1 — get_category_totals

Purpose: Retrieve category-wise spending.

Parameters:

- start_date
- end_date
- category (optional)

Execution:

- Local SQL aggregation.

### Tool 2 — get_cashflow_trend

Purpose: Compare income and expenses over time.

Parameters:

- months
- start_date (optional)
- end_date (optional)

Execution:

- Local SQL aggregation.

### Tool 3 — semantic_search_transactions

Purpose: Find transactions using natural language.

Parameters:

- query_text
- limit

Execution:

1. Generate query embedding.
2. Search local vector database.
3. Join results with local transaction records.
4. Apply privacy policy.
5. Return permitted results.

### Tool 4 — check_budget_status

Purpose: Retrieve current budget information.

Parameters:

- category (optional)

Execution:

- Local SQL budget calculations.

### Tool 5 — search_transactions

Purpose: Exact text-based transaction search.

Parameters:

- search_query
- start_date (optional)
- end_date (optional)
- limit

### Tool 6 — get_account_summary

Purpose: Retrieve account-level financial information.

Parameters:

- account_id (optional)

### Tool 7 — get_top_merchants

Purpose: Find merchants with the highest spending.

Parameters:

- start_date
- end_date
- limit

## 5.30 Tool Security Rules

- Tools must be read-only by default.
- Tool names must be allowlisted.
- Parameters must be validated.
- SQL must use prepared statements.
- No arbitrary SQL execution.
- No arbitrary file access.
- No unrestricted database access.
- Limit the amount of returned information.
- Enforce user confirmation for financial mutations.

## 5.31 AI Conversation Interface

The AI Chat screen includes:

- Conversation header.
- New conversation action.
- Chat history.
- User messages.
- AI response cards.
- Loading indicator.
- Tool execution status.
- Message input.
- Suggested questions.

Example suggested questions:

- Where did my money go?
- How much did I save?
- What is my biggest expense?
- Am I over budget?

## 5.32 AI Response Design

Responses should be:

- Concise.
- Conversational.
- Financially accurate.
- Supported by local query results.
- Transparent about missing data.

Example:

"You spent ₹8,420 on food this month.

Your biggest expense was a ₹1,450 team lunch at Swiggy on November 21.

You've used 70% of your monthly food budget."

The numbers must come from actual local tool results.

## 5.33 AI Memory

Support two memory levels:

**Short-term memory**

- Current conversation.
- Recent messages.
- Previous tool results.

**Long-term memory**

- User-defined financial preferences.
- Frequently used categories.
- User-defined recurring financial context.

Financial history should not be uploaded automatically to create persistent cloud memory.

Memory must be stored locally and selectively shared only when needed and permitted.

---

# Module 9 — Local RAG & Vector Search

## 5.34 Purpose

Allow users to search financial notes and transactions semantically.

Examples:

- Find the team lunch.
- Find the expense related to my office meeting.
- Show the transaction where I bought groceries for home.

## 5.35 Embedding Architecture

Recommended initial model:

OpenAI `text-embedding-3-small`

Default dimension: 1536.

Alternative embedding providers can be evaluated.

The database vector dimension must exactly match the selected model's output dimension.

## 5.36 Embedding Workflow

```
Transaction Created
       ↓
Local SQLite Save
       ↓
needs_embedding = 1
       ↓
Check Network
       ↓
Privacy Processing
       ↓
Embedding API
       ↓
Receive Vector
       ↓
Store in sqlite-vec
       ↓
needs_embedding = 0
```

## 5.37 Embedding Queue

Requirements:

- Process pending records in batches.
- Retry failed requests.
- Avoid duplicate embeddings.
- Handle edits and deletions.
- Support cancellation.
- Resume after application restart.
- Track retry counts.
- Use model-version metadata.
- Re-embed records when the embedding model changes.

The queue should work primarily while the application is active, with opportunistic background execution where platform scheduling permits.

## 5.38 Semantic Search

1. Receive user search query.
2. Apply privacy policy.
3. Generate query embedding.
4. Search sqlite-vec.
5. Retrieve nearest matching records.
6. Apply date and other filters.
7. Return permitted results.

---

# Module 10 — Privacy Shield & PII Scrubber

## 5.39 Purpose

Prevent unnecessary disclosure of personal and financial information.

## 5.40 Sensitive Information

Detect and protect:

- Bank account numbers.
- Card numbers.
- UPI IDs.
- Phone numbers.
- Email addresses.
- Personal names when configured.
- Addresses.
- User-defined sensitive keywords.
- Financial identifiers.

## 5.41 Scrubbing Examples

Original:

"Paid ₹1,450 to Swiggy via HDFC UPI for team lunch. My UPI is aminul\@hdfcbank."

Scrubbed:

"Paid ₹1,450 to Swiggy for team lunch. My UPI is [UPI_ID]."

## 5.42 Privacy Requirements

- Scrubbing occurs on-device.
- Network requests are explicitly controlled.
- Never send raw account identifiers unnecessarily.
- Do not log raw financial notes in application logs.
- Do not store API keys in source code.
- Use secure transport.
- Provide AI data-sharing controls.
- Explain which information is sent externally.

Important distinction:

PII redaction does not guarantee complete anonymization. Amounts, merchant names, dates, and descriptions can still reveal personal information.

SmartMoney must therefore provide an optional local-only AI mode and explicit consent for cloud processing.

---

# Module 11 — Receipt Scanner & OCR

## 5.43 Purpose

Allow users to create transactions from receipt images.

## 5.44 Receipt Scanning Flow

```
Open Receipt Scanner
       ↓
Capture / Select Image
       ↓
Local OCR
       ↓
Extract Text
       ↓
Local Parsing
       ↓
Optional AI Extraction
       ↓
Show Editable Preview
       ↓
User Confirmation
       ↓
Save Transaction
```

## 5.45 Extracted Fields

- Amount.
- Merchant.
- Date.
- Time.
- Category.
- Currency.
- Receipt reference.
- Tax information where available.

## 5.46 OCR Requirements

- OCR runs locally.
- Images remain local by default.
- Extracted values are editable.
- Low-confidence values are highlighted.
- Duplicate receipts are detected where possible.
- No transaction is saved without user confirmation.

## 5.47 Receipt Storage

Store receipt files in application-private storage.

The database stores a reference to the receipt file.

Backups must include receipt files when the user chooses a complete backup.

---

# Module 12 — CSV & Statement Import

## 5.48 Purpose

Allow users to import historical financial records.

## 5.49 Supported Formats

Initial:

- CSV.

Future:

- XLSX.
- Additional statement formats.
- PDF bank statements.

## 5.50 Import Workflow

1. Select CSV.
2. Parse locally.
3. Detect columns.
4. Map columns.
5. Preview transactions.
6. Detect duplicates.
7. Categorize using local rules.
8. Confirm import.
9. Save records in SQLite.

## 5.51 Duplicate Detection

Use a combination of:

- Transaction date.
- Amount.
- Merchant.
- Account.
- Existing transaction reference.

Duplicate detection should be configurable and must not silently discard potentially valid transactions.

## 5.52 Import Safety

- Validate all records before committing.
- Provide an import summary.
- Allow cancellation.
- Use database transactions.
- Report rejected rows and reasons.

---

# Module 13 — Backup & Restore

## 5.53 Purpose

Prevent data loss when users change or lose devices.

## 5.54 Backup Features

- Create encrypted backup.
- Export database.
- Include receipt attachments.
- Export user preferences.
- Include vector data where supported.
- Restore from backup.
- Validate backup integrity.

## 5.55 Backup Format

Recommended:

`.smartmoney`

Backup package contents:

- Encrypted database.
- Receipt attachments.
- Manifest.
- Schema version.
- Backup timestamp.
- Encryption metadata.
- Integrity verification information.

## 5.56 Security Requirements

- Use authenticated encryption.
- Derive encryption keys from a user-provided backup password using a suitable password-based KDF.
- Never store the backup password in plaintext.
- Validate the backup before restoration.
- Never overwrite the existing database without user confirmation.
- Support schema migration during restoration.

The backup password must be separate from the application's biometric lock.

---

# 6. Database Architecture

## 6.1 Database Technology

- SQLite.
- `@op-engineering/op-sqlite`.
- sqlite-vec extension.
- Database migration system.

All financial records must be stored locally.

## 6.2 Core Tables

### accounts

| Column          | Type             |
| --------------- | ---------------- |
| id              | TEXT PRIMARY KEY |
| name            | TEXT             |
| type            | TEXT             |
| initial_balance | INTEGER          |
| currency        | TEXT             |
| is_archived     | INTEGER          |
| created_at      | TEXT             |
| updated_at      | TEXT             |

### transactions

| Column           | Type             |
| ---------------- | ---------------- |
| id               | TEXT PRIMARY KEY |
| account_id       | TEXT             |
| amount_minor     | INTEGER          |
| type             | TEXT             |
| category_id      | TEXT             |
| merchant         | TEXT             |
| transaction_date | TEXT             |
| raw_note         | TEXT             |
| scrubbed_note    | TEXT             |
| needs_embedding  | INTEGER          |
| created_at       | TEXT             |
| updated_at       | TEXT             |

Store monetary values as integer minor units rather than floating-point values. For INR, ₹1,450.00 is stored as 145000 paise.

### categories

| Column      | Type             |
| ----------- | ---------------- |
| id          | TEXT PRIMARY KEY |
| name        | TEXT             |
| type        | TEXT             |
| icon        | TEXT             |
| color       | TEXT             |
| is_default  | INTEGER          |
| is_archived | INTEGER          |

### budgets

| Column              | Type             |
| ------------------- | ---------------- |
| id                  | TEXT PRIMARY KEY |
| category_id         | TEXT             |
| monthly_limit_minor | INTEGER          |
| alert_threshold     | INTEGER          |
| start_month         | TEXT             |
| created_at          | TEXT             |

### transfers

| Column          | Type             |
| --------------- | ---------------- |
| id              | TEXT PRIMARY KEY |
| from_account_id | TEXT             |
| to_account_id   | TEXT             |
| amount_minor    | INTEGER          |
| transfer_date   | TEXT             |
| note            | TEXT             |

### receipts

| Column         | Type             |
| -------------- | ---------------- |
| id             | TEXT PRIMARY KEY |
| transaction_id | TEXT             |
| file_path      | TEXT             |
| mime_type      | TEXT             |
| created_at     | TEXT             |

### embedding_jobs

| Column         | Type             |
| -------------- | ---------------- |
| id             | TEXT PRIMARY KEY |
| transaction_id | TEXT             |
| status         | TEXT             |
| retry_count    | INTEGER          |
| last_error     | TEXT             |
| created_at     | TEXT             |
| updated_at     | TEXT             |

### ai_conversations

| Column     | Type             |
| ---------- | ---------------- |
| id         | TEXT PRIMARY KEY |
| title      | TEXT             |
| created_at | TEXT             |
| updated_at | TEXT             |

### ai_messages

| Column          | Type             |
| --------------- | ---------------- |
| id              | TEXT PRIMARY KEY |
| conversation_id | TEXT             |
| role            | TEXT             |
| content         | TEXT             |
| created_at      | TEXT             |

### user_settings

| Column     | Type             |
| ---------- | ---------------- |
| key        | TEXT PRIMARY KEY |
| value      | TEXT             |
| updated_at | TEXT             |

### vec_transactions

Virtual vector table managed by sqlite-vec.

Fields:

- Transaction ID.
- Embedding vector.

Dimension must match the configured embedding model.

## 6.3 Database Rules

- Use foreign keys.
- Add indexes to frequently filtered columns.
- Use prepared statements.
- Use database transactions for multi-step changes.
- Use migration versioning.
- Maintain referential integrity.
- Avoid storing derived balances as the only source of truth.
- Use integer monetary calculations.
- Keep raw financial information local.

---

# 7. Technical Architecture

## 7.1 Technology Stack

### Frontend

- Expo.
- React Native.
- TypeScript.
- Expo Router or React Navigation.
- React Native Reanimated.

### Database

- `@op-engineering/op-sqlite`.
- sqlite-vec.

### Security

- `expo-local-authentication`.
- `expo-secure-store`.
- An appropriately configured SQLite encryption implementation.

### Networking

- `@react-native-community/netinfo`.
- Fetch API.
- Retry and queue management.

### AI

- OpenAI or Gemini API.
- Structured tool calling.
- Embedding API.
- Local tool registry.
- Local semantic retrieval.

### Receipt Processing

- `expo-image-picker`.
- On-device ML Kit OCR integration.
- Local image storage.

### CSV

- PapaParse.

### Charts

- React Native Gifted Charts or Victory Native.

### File Management

- `expo-file-system`.
- `expo-sharing`.

## 7.2 Application Architecture

Use a modular layered architecture.

```
Presentation Layer
       ↓
Feature / Application Layer
       ↓
Domain Layer
       ↓
Repository Layer
       ↓
SQLite Database
```

External services are isolated behind service interfaces.

```
AI Agent
   ↓
AI Provider Interface
   ↓
OpenAI / Gemini

Embedding Service
   ↓
Embedding Provider Interface
   ↓
Embedding API

Local Tool Registry
   ↓
Repositories
   ↓
SQLite + sqlite-vec
```

## 7.3 Suggested Folder Structure

```
src/
│
├── app/
│   ├── onboarding/
│   ├── auth/
│   ├── tabs/
│   └── settings/
│
├── components/
│   ├── ui/
│   ├── charts/
│   ├── forms/
│   └── transactions/
│
├── features/
│   ├── accounts/
│   ├── transactions/
│   ├── categories/
│   ├── budgets/
│   ├── analytics/
│   ├── receipts/
│   ├── imports/
│   └── ai-chat/
│
├── database/
│   ├── client.ts
│   ├── migrations/
│   ├── schema/
│   └── repositories/
│
├── ai/
│   ├── agent/
│   ├── tools/
│   ├── prompts/
│   ├── embeddings/
│   ├── memory/
│   └── rag/
│
├── security/
│   ├── biometric.ts
│   ├── encryption.ts
│   ├── pii-scrubber.ts
│   └── privacy-policy.ts
│
├── services/
│   ├── network/
│   ├── backup/
│   ├── notifications/
│   └── storage/
│
├── hooks/
├── types/
├── utils/
└── constants/
```

---

# 8. Privacy & Security Requirements

## 8.1 Data Classification

| Data                      | Default Storage      |
| ------------------------- | -------------------- |
| Account information       | Local                |
| Transaction information   | Local                |
| Financial notes           | Local                |
| Receipts                  | Local                |
| Budgets                   | Local                |
| Embeddings                | Local                |
| AI conversation history   | Local                |
| API credentials           | Secure storage       |
| Optional cloud AI request | External AI provider |

## 8.2 Privacy Modes

### Mode A — Local Only

- No cloud embedding requests.
- No cloud LLM requests.
- Local SQL analytics.
- Local keyword search.
- Local-only AI capabilities where an on-device model is available.

### Mode B — Privacy-Aware Cloud AI

- Explicitly enabled by the user.
- Scrubbed text only where possible.
- Minimal structured tool results.
- No unrestricted database access.
- No unnecessary identifiers.
- User-controlled opt-out.

## 8.3 Security Checklist

- Encrypted database at rest.
- Encrypted backup files.
- Secure key storage.
- HTTPS requests.
- PII redaction.
- No sensitive application logs.
- No API secrets in source code.
- Biometric application lock.
- Read-only AI tools.
- Explicit mutation confirmation.
- Secure deletion and temporary-file cleanup.
- Dependency and native-module security reviews.

## 8.4 Privacy Transparency

Provide an AI privacy screen explaining:

- What information is sent to an AI provider.
- Why it is sent.
- Whether transaction-derived information is included.
- Which provider processes it.
- How to disable cloud AI.
- How to clear local AI conversation history.

Do not claim that all information stays on-device when cloud AI or embedding services are enabled.

---

# 9. UI/UX Design Requirements

## 9.1 Visual Identity

Product name: SmartMoney.

Design direction:

- Premium.
- Minimal.
- Modern.
- Privacy-focused.
- Finance-oriented.
- Dark-first interface.

## 9.2 Color Palette

| Token          | Color   |
| -------------- | ------- |
| Background     | #0B1024 |
| Surface        | #171D38 |
| Surface Alt    | #20284A |
| Primary        | #5865F2 |
| Secondary      | #8B5CF6 |
| Accent         | #43D9A3 |
| Income         | #32D583 |
| Expense        | #FF6B81 |
| Warning        | #FFB547 |
| Text           | #F5F6FF |
| Secondary Text | #A6AFCE |
| Border         | #30395E |

## 9.3 Component Design

- Rounded cards.
- Consistent spacing.
- Clear typography.
- Subtle gradients.
- Minimal shadows.
- Accessible contrast.
- Consistent financial icons.
- Clear transaction indicators.
- Smooth but restrained animations.

## 9.4 Design Rules

- Avoid overcrowded dashboards.
- Make the transaction amount visually prominent.
- Use consistent positive and negative financial indicators.
- Keep important actions reachable.
- Support different screen sizes.
- Support Android and iOS navigation conventions.
- Include loading, empty, error, and offline states.

## 9.5 Screen Design Deliverables

The design phase must produce:

1. Welcome screen.
2. Biometric lock screen.
3. Home dashboard.
4. Transaction history.
5. Add transaction.
6. Transaction details.
7. Account management.
8. Analytics dashboard.
9. Budget dashboard.
10. Create budget.
11. AI Finance Agent.
12. Receipt scanner.
13. Import preview.
14. Settings.
15. Privacy settings.
16. Backup and restore.

---

# 10. Offline-First Requirements

## 10.1 Offline Capabilities

These features must work without internet:

- Application authentication.
- Dashboard.
- Account management.
- Transaction creation.
- Transaction editing.
- Transaction deletion.
- Category management.
- Budget management.
- Financial calculations.
- Analytics.
- Transaction filtering.
- Keyword search.
- Local receipt viewing.
- Backup export.

Cloud AI and cloud embedding generation are optional network-dependent features.

## 10.2 Network Recovery

When internet returns:

1. Detect connectivity.
2. Find pending embedding jobs.
3. Process jobs in batches.
4. Retry temporary failures.
5. Update job status.
6. Continue until completed or paused.

A failed embedding request must never block transaction creation or editing.

---

# 11. Error Handling & Edge Cases

The application must handle:

- No internet.
- Slow internet.
- AI provider unavailable.
- Embedding API failure.
- Invalid API credentials.
- SQLite database errors.
- Insufficient device storage.
- Invalid CSV files.
- Unsupported receipt formats.
- OCR failure.
- Duplicate transactions.
- Missing account references.
- Deleted categories.
- Corrupted backups.
- Incorrect backup passwords.
- Application termination during import.
- Application termination during backup.
- Database migration failure.
- Vector index inconsistency.

Financial records must remain usable even if the AI subsystem fails.

---

# 12. Non-Functional Requirements

## 12.1 Performance

- Fast application launch.
- Immediate local transaction persistence.
- Efficient indexed database queries.
- Paginated transaction history.
- Batched embedding processing.
- Efficient vector search.
- Background work must not block the UI.

## 12.2 Reliability

- Database migrations must be versioned.
- Important writes must use transactions.
- Backup integrity must be verified.
- AI failures must not affect financial records.
- Database recovery must be considered.

## 12.3 Accessibility

- Screen reader support.
- Accessible touch targets.
- Clear text contrast.
- Scalable text.
- Meaningful chart labels.
- Do not communicate income and expenses through color alone.

## 12.4 Compatibility

Initial target:

- Android.
- iOS.

Native modules require Expo Development Builds. Expo Go is not the target runtime for the complete application.

---

# 13. Product Roadmap

## Phase 1 — Foundation

Deliverables:

- Expo project setup.
- TypeScript configuration.
- Navigation.
- Theme system.
- SQLite integration.
- Database migrations.
- Encryption strategy.
- Biometric authentication.
- Secure storage.

Acceptance:

- Application launches.
- Database initializes.
- Authentication works.
- Database can be reopened after app restart.
- Data is protected according to the selected encryption design.

## Phase 2 — Core Finance Ledger

Deliverables:

- Onboarding.
- Accounts.
- Transactions.
- Categories.
- Transfers.
- Budgets.
- Dashboard.
- Transaction history.
- Analytics.

Acceptance:

- Users can manage finances offline.
- Balances are accurate.
- Transfers do not inflate income or expenses.
- Dashboard totals match SQL queries.

## Phase 3 — Privacy & RAG

Deliverables:

- PII scrubber.
- Embedding provider interface.
- Embedding queue.
- sqlite-vec.
- Semantic search.
- Retry management.

Acceptance:

- Sensitive patterns are scrubbed before external requests.
- Failed jobs can resume.
- Updated transactions invalidate stale embeddings.
- Semantic search retrieves relevant local records.

## Phase 4 — AI Finance Agent

Deliverables:

- AI provider integration.
- Tool registry.
- Tool schemas.
- Conversation interface.
- SQL tools.
- Vector search tool.
- AI response generation.
- Privacy controls.

Acceptance:

- AI can answer supported financial questions.
- Financial totals come from local SQL.
- Search results come from local retrieval.
- No arbitrary SQL execution.
- AI cannot mutate financial records without confirmation.

## Phase 5 — Receipt & Statement Import

Deliverables:

- Receipt scanner.
- On-device OCR.
- Structured extraction.
- CSV parser.
- Column mapping.
- Duplicate detection.
- Import preview.

Acceptance:

- OCR results can be reviewed.
- Transactions require confirmation.
- CSV data is validated before insertion.
- Import failures do not partially corrupt the ledger.

## Phase 6 — Backup & Release

Deliverables:

- Encrypted backup.
- Restore.
- Backup validation.
- Security audit.
- Performance optimization.
- Automated testing.
- Store preparation.

Acceptance:

- Complete backup can be restored.
- Incorrect passwords are rejected.
- Existing data is not silently overwritten.
- Release build passes regression tests.

---

# 14. Testing Strategy

## 14.1 Unit Testing

Test:

- Financial calculations.
- Budget calculations.
- Category aggregation.
- PII scrubbing.
- Date filtering.
- Transaction validation.
- CSV parsing.
- Duplicate detection.
- Embedding queue logic.

## 14.2 Integration Testing

Test:

- SQLite repositories.
- Database migrations.
- Account balance updates.
- Transfers.
- sqlite-vec insertion and search.
- AI tool execution.
- Backup and restore.

## 14.3 End-to-End Testing

Scenarios:

1. Create account.
2. Add expense.
3. Verify balance.
4. Add income.
5. Verify dashboard.
6. Create budget.
7. Exceed budget.
8. Search transaction.
9. Ask AI for monthly spending.
10. Import receipt.
11. Export backup.
12. Restore backup.

## 14.4 Offline Testing

- Disable internet.
- Create transactions.
- Edit transactions.
- View analytics.
- Restart application.
- Reopen database.
- Restore internet.
- Verify embedding queue recovery.

## 14.5 Security Testing

- Inspect network payloads.
- Test PII patterns.
- Verify database encryption.
- Inspect logs.
- Test API key handling.
- Test backup password failures.
- Attempt unauthorized AI tool execution.

---

# 15. MVP Scope

The first public version should focus on reliable financial management rather than trying to deliver every advanced AI feature immediately.

## MVP — Must Have

- Onboarding.
- Biometric lock.
- Local SQLite database.
- Accounts.
- Transactions.
- Categories.
- Transfers.
- Monthly budgets.
- Dashboard.
- Transaction history.
- Analytics.
- Local search.
- Encrypted backup and restore.

## Version 1.1

- Cloud AI assistant.
- PII scrubbing.
- SQL-based AI tools.
- Conversational financial summaries.

## Version 1.2

- Embedding generation.
- sqlite-vec.
- Semantic transaction search.
- AI-powered receipt extraction.

## Version 1.3

- OCR improvements.
- CSV statement imports.
- Advanced analytics.
- Recurring transaction detection.
- More advanced financial insights.

---

# 16. Future Enhancements

Potential future capabilities:

- On-device LLM integration.
- Fully local conversational AI.
- Recurring transaction detection.
- Subscription tracking.
- Financial goal planning.
- Savings goal tracking.
- Debt tracking.
- Net-worth tracking.
- Multi-currency support.
- Custom reports.
- Export to CSV/PDF.
- Voice-based expense entry.
- Smart transaction categorization.
- Natural-language budget creation.
- Optional encrypted device-to-device transfer.

These features must not compromise the local-first architecture.

---

# 17. Definition of Done

SmartMoney is ready for its first production release when:

- Core application works without internet.
- Financial records persist locally.
- Database encryption is implemented and tested.
- Biometric locking works.
- Accounts and transactions work correctly.
- Transfers are handled without double counting.
- Budgets calculate correctly.
- Analytics match database calculations.
- Transaction history supports filtering and search.
- Backup and restore work reliably.
- Privacy controls are implemented.
- No sensitive information is unintentionally logged.
- AI tools cannot perform unauthorized mutations.
- All critical test scenarios pass.
- Android and iOS builds are verified.

---

# 18. Final Product Definition

SmartMoney is not simply an expense tracker with a chatbot.

It is a local-first personal financial management system with an AI interface.

Its core architecture separates responsibilities:

**SQLite handles financial truth.**

**sqlite-vec handles semantic retrieval.**

**The application enforces privacy and permissions.**

**The cloud LLM understands questions and explains results.**

**The user remains in control of every financial action.**

The defining product promise:

"Understand your money. Control your finances. Keep your data private."

**SmartMoney — Your Private AI Finance Companion.**

### **Recommended next step**

Use this PRD as the single source of truth for development.

I recommend creating these three companion documents next:

1. **Technical Architecture Document (TAD):** Detailed database relationships, module boundaries, AI agent architecture, and data-flow diagrams.
2. **UI/UX Specification:** Every screen, component, interaction, navigation flow, and design token.
3. **Development Task Breakdown:** Epics, user stories, implementation tasks, dependencies, and acceptance criteria.

The most important thing: build the financial ledger first, make it reliable, and then introduce AI without compromising privacy or financial accuracy.