# AIDA OS

Static, client-side CRM for a small agency. It manages clients, opportunities and tasks; calculates the overview from the records you enter; supports search, record details, JSON export/import and workspace clearing.

All information stays in the browser's `localStorage` under the current browser profile. It is not sent to a server.

## Run locally

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Production note

This is intentionally a local single-user workspace. Multi-user access, authentication, backups, permissions, cloud storage, or using it for real client operations require a secure backend before production use.
