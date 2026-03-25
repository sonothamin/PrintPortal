# PrintPortal: Campus-Wide Printing Ecosystem

PrintPortal is a comprehensive, production-grade printing management platform designed for campus environments. It bridges the gap between student document management, administrative oversight, and physical kiosk fulfillment through a secure, high-performance web architecture.

## Goal & Usage

The primary goal of PrintPortal is to provide a **frictionless, self-service printing experience** for students while maintaining strict administrative control over hardware and finances.

- **Students**: Upload documents from any device, manage a digital wallet, and release prints at any campus kiosk using a secure code or QR scan.
- **Administrators**: Monitor global print queues, manage user accounts (including suspension), generate recharge vouchers, and configure real-time pricing.
- **Kiosks**: Low-on-resource, high-reliability terminals that handle silent PDF fulfillment without requiring user login at the hardware level.

---

## How it Works: Technical Flow

### 1. Recharging (Wallet)
- **Voucher Generation**: Admins generate unique, high-entropy tokens via the **`generate-tokens`** Edge Function.
- **Atomic Redemption**: Users scan or enter a token. The **`redeem-token`** Edge Function executes a PostgreSQL `FOR UPDATE` transaction, ensuring balance updates and token consumption are **atomic** and protected against race conditions.

### 2. Spending (Print Queue)
- **Pre-flight Analysis**: When a user uploads a PDF, the **`add-to-queue`** Edge Function uses `pdf-lib` to analyze page counts and color metadata server-side to prevent client-side price spoofing.
- **Queueing**: Jobs are stored in the `print_jobs` table with a `pending` status and an encrypted `release_code`.

### 3. Kiosk Fulfillment (Silent Print)
- **Verification**: The Kiosk app (optimized for Electron/Full-screen) invokes the **`release-job`** Edge Function.
- **Financial Clearance**: The server verifies the user's balance and deducts the cost in a single transaction before generating a **short-lived signed URL** (600s) for the document.
- **Printing**: The Kiosk receives the secure URL and triggers a silent print to the local system drivers.

### 4. Administration & Security
- **Global Invariants**: The [**`is_admin()`**](file:///home/sonoth/PrintPortal/setup_db.sql#L107-115) database function and Row Level Security (RLS) policies enforce that suspended users—even if they are administrators—cannot perform write operations.
- **Storage Maintenance**: Admins use `clear-temp-files` and `clear-queue-uploads` Edge Functions to manage the Supabase Storage buckets recursively.

---

## Tech Stack

- **Frontend**: [Next.js 15](https://nextjs.org/) (App Router), React 19, [Material UI v7](https://mui.com/).
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL + GoTrue).
- **Serverless Compute**: Supabase Edge Functions (Deno/TypeScript).
- **Storage**: Supabase Storage with RLS-protected private buckets.
- **Processing**: `pdf-lib` for document manipulation and metadata extraction.

---

## Installation Guide

### 1. Prerequisites
- Node.js 20.x or later.
- Supabase CLI (`npm install supabase --save-dev`).

### 2. Database & Functions
1. Create a new Supabase project.
2. Run the master setup script in the SQL Editor: [**`setup_db.sql`**](file:///home/sonoth/PrintPortal/setup_db.sql).
3. Deploy the Edge Functions:
   ```bash
   npx supabase functions deploy --no-verify-jwt
   ```

### 3. Frontend Setup
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

---

## Contributing

We welcome contributions from the campus community! Whether it's a bug fix, a new feature (like cloud storage integration), or UI improvements, please feel free to:
1. Fork the repo.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## License

Distributed under the **MIT License**. See `LICENSE` for more information.

---
Built with ❤️ for rapid campus fulfillment.
