# GreenMeter AI — Login Credentials

All accounts use **email + password** authentication.

---

## Dev Admin Account

| Email                      | Password           | Tenant            | Role  |
|----------------------------|--------------------|--------------------|-------|
| `admin@greenmeter.local`   | `GreenMeter@2026`  | GreenMeter Dev Co  | admin |

Seeded via: `npx tsx scripts/seed-dev-user.ts`

---

## Demo Tenant Accounts

Seeded via: `npx tsx scripts/seed-demo.ts`

| Email                        | Password           | Name          | Tenant                   | Sector                   |
|------------------------------|--------------------| --------------|--------------------------|--------------------------|
| `demo@greenmeter.ai`        | `Demo@2026`        | Demo User     | Infosys Technologies     | IT Services              |
| `admin@infosys-demo.com`     | `Infosys@2026`     | Rajesh Kumar  | Infosys Technologies     | IT Services              |
| `admin@siemens-demo.com`     | `Siemens@2026`     | Hans Mueller  | Siemens Energy AG        | Industrial Manufacturing |
| `admin@givaudan-demo.com`    | `Givaudan@2026`    | Marie Dupont  | Givaudan SA              | Specialty Chemicals      |
| `admin@tatasteel-demo.com`   | `TataSteel@2026`   | Arjun Mehta   | Tata Steel Industries    | Steel & Mining           |
| `admin@hdfcbank-demo.com`    | `HDFC@2026`        | Priya Sharma  | HDFC Banking Group       | Financial Services       |
| `admin@drreddy-demo.com`     | `DrReddy@2026`     | Vikram Reddy  | Dr. Reddy's Laboratories | Pharmaceuticals          |

---

## Database

| Field    | Value                                                               |
|----------|---------------------------------------------------------------------|
| Host     | `localhost`                                                         |
| Port     | `5432`                                                              |
| Database | `greenmeter`                                                        |
| Username | `greenmeter`                                                        |
| Password | `greenmeter_local`                                                  |
| URL      | `postgresql://greenmeter:greenmeter_local@localhost:5432/greenmeter` |

---

## How to Seed

```bash
# Start the database
docker compose up -d

# Push schema (adds password_hash column)
cd greenmeter
npx drizzle-kit push

# Seed KPI parameters (required first)
npx tsx scripts/seed-parameters.ts
npx tsx scripts/seed-canonical-metrics.ts

# Option A: Dev user only (1 tenant)
npx tsx scripts/seed-dev-user.ts

# Option B: Full demo data (6 tenants with KPIs, goals, benchmarks)
npx tsx scripts/seed-demo.ts

# Option C: Excel ESG data (12 companies × 3 years of real ESG data)
npx tsx scripts/seed-excel-data.ts
```

---

## Excel Data Seed Accounts (12 companies)

Seeded via: `npx tsx scripts/seed-excel-data.ts`

### BRSR Companies (India)

| Email                        | Password           | Name           | Tenant                   | Sector                    |
|------------------------------|--------------------| ---------------|--------------------------|---------------------------|
| `admin@infosys-demo.com`     | `Infosys@2026`     | Rajesh Kumar   | Infosys Technologies     | IT Services               |
| `admin@tatasteel-demo.com`   | `TataSteel@2026`   | Arjun Mehta    | Tata Steel Industries    | Steel & Mining            |
| `admin@reliance-demo.com`    | `Reliance@2026`    | Anant Sharma   | Reliance Industries      | Diversified Conglomerate  |
| `admin@tcs-demo.com`         | `TCS@2026`         | Suresh Iyer    | TCS                      | IT Services               |

### ESRS Companies (Europe)

| Email                        | Password           | Name           | Tenant                   | Sector                    |
|------------------------------|--------------------| ---------------|--------------------------|---------------------------|
| `admin@siemens-demo.com`     | `Siemens@2026`     | Hans Mueller   | Siemens Energy AG        | Industrial Technology     |
| `admin@novo-demo.com`        | `NovoNordisk@2026` | Lars Jensen    | Novo Nordisk             | Pharmaceuticals           |
| `admin@mercedes-demo.com`    | `Mercedes@2026`    | Klaus Weber    | Mercedes-Benz            | Automotive                |
| `admin@volkswagen-demo.com`  | `Volkswagen@2026`  | Dieter Schmidt | Volkswagen Group         | Automotive                |

### GRI Companies (Global)

| Email                        | Password           | Name           | Tenant                   | Sector                    |
|------------------------------|--------------------| ---------------|--------------------------|---------------------------|
| `admin@givaudan-demo.com`    | `Givaudan@2026`    | Marie Dupont   | Givaudan SA              | Flavours & Fragrances     |
| `admin@walmart-demo.com`     | `Walmart@2026`     | John Smith     | Walmart Inc.             | Retail                    |
| `admin@merck-demo.com`       | `Merck@2026`       | Friedrich Braun| Merck KGaA               | Pharmaceuticals           |
| `admin@iff-demo.com`         | `IFF@2026`         | Michael Davis  | IFF                      | Specialty Chemicals       |

---

## Auth Notes

- Passwords are hashed with **bcrypt** (10 rounds) and stored in the `password_hash` column
- Microsoft Entra ID (Azure AD) OAuth is also supported for production use
- JWT session strategy — tokens contain `userId`, `tenantId`, and `role`
