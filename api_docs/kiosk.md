# Kiosk API Documentation

This document covers the Supabase Edge Functions specifically designed for Kiosk interactions and job fulfillment.

## 1. Authentication
Kiosk functions require a valid Supabase JWT with the `kiosk` (or `admin`) role.
`Authorization: Bearer <jwt>`

---

## 2. Kiosk Endpoints

### `kiosk-ping`
**Description**: Heartbeat signals from terminals to the backend. Updates the `last_ping` timestamp.
- **Method**: `POST`
- **Body**: `{ "kiosk_id": "uuid" }`
- **Response**: 
  ```json
  { 
    "success": true, 
    "status": "online",
    "kiosk": { "id": "uuid", "name": "string", "last_ping": "iso_date" },
    "server_time": "iso_date"
  }
  ```

### `kiosk-refund`
**Description**: Reverses a print job transaction and returns funds to the student's wallet.
- **Method**: `POST`
- **Body**: `{ "print_job_id": "uuid" }`
- **Response**: `{ "success": true, "refunded_amount": "number", "user_id": "uuid" }`

### `release-job`
**Description**: Atomically processes a job release. Deducts balance, updates status, and generates a signed download URL.
- **Method**: `POST`
- **Body**: 
  - Find by ID: `{ "job_id": "uuid" }`
  - Find by Code: `{ "release_code": "6_char_string" }`
- **Response**: 
  ```json
  { 
    "success": true, 
    "new_balance": "number", 
    "file_url": "signed_storage_url" 
  }
  ```
