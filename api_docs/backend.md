# Backend API Documentation

This document covers the Supabase Edge Functions used for general backend operations and administrative tasks.

## 1. Authentication & Security
All APIs require a valid Supabase User JWT in the `Authorization` header:
`Authorization: Bearer <user_jwt>`

Functions performing sensitive operations also verify the user's role and status (active/suspended).

---

## 2. User & Admin APIs

### `add-to-queue`
**Description**: Finalizes a print request, moves the file to permanent storage, and creates a print job record.
- **Method**: `POST`
- **Body**:
  ```json
  {
    "file_path": "string",
    "file_name": "string",
    "is_color": "boolean",
    "copies": "number"
  }
  ```
- **Response**: `{ "success": true, "job_id": "uuid", "release_code": "string", "cost": "number" }`

### `admin-actions`
**Description**: Multi-purpose administrative endpoint.
- **Method**: `POST`
- **Body**: Requires an `action` field.
  - `update-balance`: `{ "action": "update-balance", "user_id": "uuid", "new_balance": "number" }`
  - `update-settings`: `{ "action": "update-settings", "pricing": { ... } }`
  - `delete-token`: `{ "action": "delete-token", "token_id": "uuid" }`
  - `delete-notification`: `{ "action": "delete-notification", "notification_id": "uuid" }`
- **Response**: `{ "success": true, ... }`

### `generate-tokens`
**Description**: Batch generates recharge vouchers (admin only).
- **Method**: `POST`
- **Body**: `{ "count": "number", "value": "number" }`
- **Response**: `{ "success": true, "tokens": [{ "code": "string", "value": "number" }] }`

### `redeem-token`
**Description**: Redeems a recharge voucher to a user's wallet.
- **Method**: `POST`
- **Body**: `{ "token_code": "string" }`
- **Response**: `{ "success": true, "new_balance": "number", "amount_added": "number" }`

### `user-status-update`
**Description**: Suspend or reactivate a user account (admin only).
- **Method**: `POST`
- **Body**: `{ "user_id": "uuid", "status": "active" | "suspended" }`
- **Response**: `{ "success": true }`

### `verify-document`
**Description**: Server-side verification of PDF documents before queuing.
- **Method**: `POST`
- **Body**: `{ "file_path": "string", "is_color": "boolean", "copies": "number" }`
- **Response**: `{ "success": true, "page_count": "number", "cost": "number" }`

---

## 3. Maintenance APIs

### `clear-queue-uploads`
**Description**: Purges all finalized job files from storage (admin only).
- **Method**: `POST`
- **Response**: `{ "success": true, "count": "number" }`

### `clear-temp-files`
**Description**: Purges all temporary upload files from storage (admin only).
- **Method**: `POST`
- **Response**: `{ "success": true, "count": "number" }`
