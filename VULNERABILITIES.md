# Vulnerability Report

This document outlines security vulnerabilities identified in the current authentication implementation.

## 1. User Enumeration via Timing Attack (SignIn)

**Location**: `src/actions/auth/signin.ts`

**Description**:
The `signIn` function exhibits a timing discrepancy that allows an attacker to distinguish between a valid username and an invalid one.
- If the user is not found in the database, the function returns immediately.
- If the user is found, the function proceeds to verify the password using `bcrypt.compare`, which is a computationally expensive operation (configured with 10-15 rounds).

This difference in response time (milliseconds vs. hundreds of milliseconds) enables an attacker to enumerate valid usernames.

**Code Snippet**:
```typescript
const dbUser = await prisma.user.findUnique({where: {login}});
if (!dbUser) {
  return AUTH_FAILED; // Returns fast
}
const passwordsMatch = await bcrypt.compare(password, dbUser.password); // Slow
```

**Recommendation**:
Normalize the execution time by performing a dummy password comparison even when the user is not found.

## 2. Weak Password Policy

**Location**: `src/app/auth/signup/signup-form-schema.ts`

**Description**:
The password validation schema `signupFormValidationSchema` only enforces a minimum length of 1 character. This is insufficient to protect against brute-force attacks and credential stuffing.

**Code Snippet**:
```typescript
password: z.string().min(1, {message: 'Password is required'}),
```

**Recommendation**:
Enforce a stronger password policy (e.g., minimum 8 characters, requiring a mix of letters, numbers, and special characters).

## 3. User Enumeration (SignUp)

**Location**: `src/actions/auth/signup.ts`

**Description**:
The `signUp` function explicitly returns a specific error message when a user attempts to register with an existing login: `"User with this login already exists."`. This allows anyone to verify if a user is already registered.

**Code Snippet**:
```typescript
if (existingUser) {
  return {
    user: null,
    error: 'User with this login already exists.',
  };
}
```

**Recommendation**:
Return a generic error message or succeed silently (sending an email instead) to prevent enumeration, although this may impact User Experience.

## 4. Lack of Rate Limiting

**Location**: `src/actions/auth/signin.ts`

**Description**:
There is no rate limiting mechanism implemented on the `signIn` action. An attacker can attempt an unlimited number of login requests to guess passwords (brute-force) or enumerate users.

**Recommendation**:
Implement rate limiting based on IP address or username (after successful lookup verification) to restrict the number of login attempts within a specific timeframe.
