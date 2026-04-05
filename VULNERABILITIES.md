# Vulnerability Report

This document outlines security vulnerabilities identified in the current authentication and application implementation. The findings are categorized by their nature and potential impact.

## 1. Authentication & Session Management

### 1.1. User Enumeration via Timing Attack (SignIn)
**Severity:** Medium
**Location:** `src/actions/auth/signin.ts`

**Description:**
The `signIn` function exhibits a significant timing discrepancy that allows an attacker to distinguish between a valid username and an invalid one.
- **Scenario A (User Not Found):** The function returns immediately after the database query (`prisma.user.findUnique`).
- **Scenario B (User Found, Wrong Password):** The function proceeds to verify the password using `bcrypt.compare`, which is a computationally expensive operation (configured with 10-15 rounds).

This difference in response time (typically <10ms vs >300ms) enables an attacker to accurately enumerate valid usernames in the database.

**Recommendation:**
Normalize execution time by ensuring `bcrypt.compare` is called even if the user is not found (using a dummy hash), or use a constant-time comparison approach for the entire flow.

### 1.2. Cross-Site Request Forgery (CSRF) on Logout
**Severity:** Medium
**Location:** `src/app/api/auth/signout/route.ts` & `src/proxy.ts`

**Description:**
The logout endpoint is implemented as a GET request and is explicitly bypassed in the `proxy` middleware's CSRF protection checks.
- `src/proxy.ts`: `if (request.nextUrl.pathname == SIGN_OUT_URL) { return NextResponse.next(); }`
- `src/app/api/auth/signout/route.ts`: `export async function GET(): Promise<Response> { ... }`

An attacker can trick a user into clicking a link (e.g., via an image tag or hidden iframe) pointing to `/api/auth/signout`, forcing them to log out without their consent. While not leading to account compromise, it is a nuisance and can be chained with other attacks.

**Recommendation:**
Convert the logout action to a POST request and ensure it is protected by the standard CSRF checks (or Same-Origin checks in `proxy.ts`).

### 1.3. Lack of Session Binding
**Severity:** Low/Medium
**Location:** `src/lib/auth/session.ts`

**Description:**
Session tokens are not bound to the user's IP address or User-Agent string. If a session cookie is stolen (e.g., via XSS or Man-in-the-Middle on non-HTTPS connections), it can be used by an attacker from a different location or device until it expires.

**Recommendation:**
Store a hash of the User-Agent and/or IP address in the session record and validate it on every request.

### 1.4. Weak Password Policy
**Severity:** High
**Location:** `src/app/auth/signup/signup-form-schema.ts`

**Description:**
The password validation schema `signupFormValidationSchema` only enforces a minimum length of 1 character (`z.string().min(1)`). This is critically insufficient and makes the system vulnerable to trivial brute-force attacks and credential stuffing.

**Recommendation:**
Enforce a robust password policy (e.g., minimum 10 characters, NIST guidelines).

### 1.5. User Enumeration (SignUp)
**Severity:** Low
**Location:** `src/actions/auth/signup.ts`

**Description:**
The `signUp` function returns a specific error message (`"User with this login already exists."`) when registration fails due to a duplicate username. This allows attackers to verify the existence of registered users.

**Recommendation:**
Use a generic error message or implement a silent failure mode (e.g., "If an account exists, you will receive an email").

### 1.6. Lack of Rate Limiting
**Severity:** High
**Location:** `src/actions/auth/signin.ts`

**Description:**
There is no rate limiting mechanism on the `signIn` action. An attacker can attempt an unlimited number of login requests to guess passwords (brute-force) or enumerate users.

**Recommendation:**
Implement rate limiting (e.g., using Redis or a database counter) based on IP address and/or username.

## 2. Architecture & Configuration

### 2.1. Insecure Authentication Architecture (Missing Middleware Enforcement)
**Severity:** High
**Location:** `src/proxy.ts`

**Description:**
The project uses a `proxy` middleware that handles routing and simple header checks but does **not** perform authentication. Authentication is delegated to per-page/layout checks (e.g., `src/app/(authenticated)/layout.tsx`).
This "decentralized" security model is prone to error. If a developer creates a new route outside the `(authenticated)` group and forgets to manually call `getCurrentSession()`, the route will be publicly accessible by default. This violates the principle of "Secure by Default".

**Recommendation:**
Implement a centralized authentication check in `middleware.ts` (or `proxy.ts`) that denies access to all routes by default, allowing only specific public paths (allowlist approach).

### 2.2. Missing Security Headers (Clickjacking & XSS)
**Severity:** Medium
**Location:** `next.config.js`

**Description:**
The application does not configure standard security headers. Specifically:
- **X-Frame-Options** is missing, allowing the site to be framed by other domains (Clickjacking).
- **Content-Security-Policy (CSP)** is missing, increasing the risk of XSS.
- **Strict-Transport-Security (HSTS)** is not explicitly enforced in application config (though may be handled by upstream Nginx).

**Recommendation:**
Configure the `headers` function in `next.config.js` to set `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and a restrictive `Content-Security-Policy`.

### 2.3. Potential Data Leakage in Error Logs
**Severity:** Low
**Location:** `src/lib/openbanking/truelayer/token.tsx`

**Description:**
The Open Banking integration logs full JSON error responses from upstream providers (`console.warn(..., JSON.stringify(json))`). While useful for debugging, if the upstream provider echoes back sensitive request data (like refresh tokens or client secrets) in error payloads, this would result in credentials being written to server logs.

**Recommendation:**
Sanitize log outputs to ensure no tokens or secrets are ever written to logs.
