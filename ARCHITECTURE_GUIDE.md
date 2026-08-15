# 🏗️ Welth Architecture & Data Flow Guide

A comprehensive guide to understanding how Clerk authentication, Supabase database, React Hook Form, and the app's routing system work together.

---

## Table of Contents

1. [useForm Hook Explained](#useform-hook-explained)
2. [Controller & Render Objects](#controller--render-objects)
3. [Clerk + Supabase Architecture](#clerk--supabase-architecture)
4. [useSupabase Hook Deep Dive](#usesupabase-hook-deep-dive)
5. [useUserSync Hook](#useusersync-hook)
6. [Zustand Store](#zustand-store)
7. [Onboarding Flow](#onboarding-flow)
8. [Complete Data Flow Timeline](#complete-data-flow-timeline)
9. [Design Decisions Explained](#design-decisions-explained)

---

## useForm Hook Explained

### What is useForm?

`useForm` is a React Hook Form hook that manages form state, validation, and submission.

### Basic Syntax

```typescript
const {
  control,
  handleSubmit,
  formState: { errors: formErrors },
} = useForm<SignUpFormValues>({
  resolver: zodResolver(signUpSchema),
  mode: "onBlur",
  defaultValues: { firstName: "", lastName: "", email: "", password: "" },
});
```

### Breaking It Down

#### **1. Configuration Object**

```typescript
{
  resolver: zodResolver(signUpSchema),  // ← Use Zod for validation
  mode: "onBlur",                       // ← Validate when field loses focus
  defaultValues: {                      // ← Initial field values
    firstName: "",
    lastName: "",
    email: "",
    password: ""
  }
}
```

| Option           | What It Does                                              |
| ---------------- | --------------------------------------------------------- |
| `resolver`       | Plugs in Zod schema validator                             |
| `mode: "onBlur"` | Validates when user leaves field (not on every keystroke) |
| `defaultValues`  | Starting values for all form fields                       |

#### **2. Return Values**

```typescript
const { control, handleSubmit, formState: { errors: formErrors } } = useForm(...)
```

| Return         | What It Is                                      |
| -------------- | ----------------------------------------------- |
| `control`      | Connects each input field to the form state     |
| `handleSubmit` | Validates form, then calls your submit function |
| `formErrors`   | Validation errors from Zod schema               |

### How It Works Internally

```
Form State (in memory):
┌──────────────────────────────────────┐
│ {                                    │
│   firstName: "John",                 │
│   lastName: "Doe",                   │
│   email: "john@email.com",           │
│   password: "secret123"              │
│ }                                    │
└──────────────────────────────────────┘

Each Controller watches one field:
┌─────────────────────┐
│ name="firstName"   │  ← watches formState.firstName
└─────────────────────┘
┌─────────────────────┐
│ name="email"       │  ← watches formState.email
└─────────────────────┘
```

### The Data Flow

```
1. User types in TextInput
   ↓
2. onChangeText={onChange} fires
   ↓
3. onChange updates form state for that field
   ↓
4. React re-renders the component with new value
   ↓
5. TextInput shows updated value
   ↓
6. When field loses focus (mode: "onBlur"):
   ↓
7. Zod validates this field
   ↓
8. If error: formErrors.email = { message: "..." }
   ↓
9. Component re-renders and shows error message
```

### Submission Flow

```typescript
onPress={handleSubmit(onSignUpPress)}
```

**What happens when you press the button:**

```
1. handleSubmit checks ALL fields against Zod schema
   ↓
2. If ANY field fails validation:
   ↓
   ✗ Stop here
   ✗ formErrors now contains all errors
   ✗ onSignUpPress is NOT called
   ✗ Show error messages to user
   ↓
3. If ALL fields pass validation:
   ↓
   ✓ handleSubmit calls onSignUpPress(formValues)
   ✓ formValues = { firstName: "John", lastName: "Doe", email: "...", password: "..." }
   ✓ Backend receives complete form data
```

---

## Controller & Render Objects

### What is Controller?

`Controller` is a wrapper that connects React Native inputs to React Hook Form state.

**Without Controller:** Input is just a dumb UI component
**With Controller:** Input is connected to form state and validation

### Basic Structure

```typescript
<Controller
  control={control}              // ← From useForm
  name="email"                   // ← Which form field
  render={({ field: { value, onChange } }) => (
    <TextInput
      value={value}              // ← Current value from form
      onChangeText={onChange}    // ← Update form when typing
    />
  )}
/>
```

### The Render Prop Object

When the render function executes, it receives an object with this shape:

```typescript
{
  field: {
    value,           // ← Current field value from form state
    onChange,        // ← Function to update this field
    onBlur,          // ← Function called when field loses focus
    name,            // ← Field name (e.g., "email")
    ref               // ← React ref (for focus management)
  },
  fieldState: {
    invalid,         // ← boolean: is this field invalid?
    isTouched,       // ← boolean: has user interacted with it?
    isDirty,         // ← boolean: has value changed since initial?
    error            // ← { message: "..." } if validation failed
  },
  formState           // ← Overall form state
}
```

### Data Flow with Controller

```
TypeScript:
value: string = "john@email.com"
onChange: (value: string) => void

Visual Timeline:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Initial Render:
┌─────────────────────────────────────┐
│ Form State                          │
│ { email: "" }                       │
└─────────────────────────────────────┘
        ↓
Controller extracts: value = ""
        ↓
TextInput renders empty: ""

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User Types "j":
┌─────────────────────────────────────┐
│ TextInput detects onChangeText("j") │
└─────────────────────────────────────┘
        ↓
onChange("j") is called
        ↓
┌─────────────────────────────────────┐
│ Form State                          │
│ { email: "j" }                      │
└─────────────────────────────────────┘
        ↓
Component re-renders
        ↓
Controller extracts: value = "j"
        ↓
TextInput shows: "j"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User Leaves Field (blur):
┌─────────────────────────────────────┐
│ onBlur fires                        │
└─────────────────────────────────────┘
        ↓
Zod validates: "j" is not a valid email
        ↓
┌─────────────────────────────────────┐
│ formState.errors                    │
│ { email: { message: "..." } }       │
└─────────────────────────────────────┘
        ↓
Component re-renders
        ↓
Error message displays
```

### Why This Design?

**Without Controller (direct useState):**

```typescript
const [email, setEmail] = useState("");
const [emailError, setEmailError] = useState("");

// Manual validation
const handleBlur = () => {
  if (!isValidEmail(email)) {
    setEmailError("Invalid email");
  }
};

// Manual submission
const handleSubmit = () => {
  if (!isValidEmail(email)) return;
  // submit...
};
```

**Problems:**

- ❌ Repetitive for every field
- ❌ Validation logic scattered
- ❌ Error messages manual
- ❌ Hard to reuse

**With Controller (React Hook Form):**

```typescript
// One useForm call handles ALL fields
// One Controller per field
// Validation automatic
// Errors automatic
// Reusable everywhere
```

---

## Clerk + Supabase Architecture

### The Three-Layer System

```
┌─────────────────────────────────────────────────┐
│  Layer 1: Authentication (Clerk)                │
│  ─────────────────────────────────────────────  │
│  • Handles signup/login                         │
│  • Issues JWT tokens                            │
│  • Manages user identity                        │
│  • Returns: user data + token                   │
└──────────────────┬────────────────────────────────┘
                   │ (passes JWT token)
                   ↓
┌─────────────────────────────────────────────────┐
│  Layer 2: Database (Supabase)                   │
│  ─────────────────────────────────────────────  │
│  • PostgreSQL database                          │
│  • Stores user profiles, accounts, transactions│
│  • Validates JWT from Clerk                     │
│  • Returns: queried data or error               │
└──────────────────┬────────────────────────────────┘
                   │ (synced data)
                   ↓
┌─────────────────────────────────────────────────┐
│  Layer 3: App State (Zustand)                   │
│  ─────────────────────────────────────────────  │
│  • In-memory state                              │
│  • currency: "INR"                              │
│  • needsOnboarding: true/false                  │
│  • Fast access for UI                           │
└─────────────────────────────────────────────────┘
```

### Why This Separation?

| Layer        | What           | Why                                |
| ------------ | -------------- | ---------------------------------- |
| **Clerk**    | Authentication | Specialized auth provider (secure) |
| **Supabase** | Database       | Persistent data storage            |
| **Zustand**  | App State      | Fast UI rendering, local cache     |

**Analogy:**

```
Clerk = Door Guard (verifies you are who you say you are)
Supabase = File Cabinet (stores your files securely)
Zustand = Notepad on desk (keeps frequently needed info handy)
```

---

## useSupabase Hook Deep Dive

### The File: lib/supabase.ts

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Url or Key");
}

const resolvedSupabaseUrl = supabaseUrl;
const resolvedSupabaseAnonKey = supabaseAnonKey;

export function createClerkSupabaseClient(
  getToken: () => Promise<string | null>,
) {
  return createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey, {
    async accessToken() {
      return getToken();
    },
  });
}
```

### Line-by-Line Explanation

#### **Lines 1, 3-4: Environment Variables**

```typescript
import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;
```

**What's stored in `.env`:**

```
EXPO_PUBLIC_SUPABASE_URL=https://abc123.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=eyJhbGc...publickey...
```

**Why environment variables?**

- URL and key should NOT be in code
- Easy to change per environment (dev/prod)
- Keep secrets out of version control

#### **Lines 6-8: Validation**

```typescript
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Url or Key");
}
```

**What it does:**

- If either is missing, CRASH immediately
- This is BETTER than failing silently later

**Why?**

- Fail fast principle: catch errors early
- Clear error message for developers

#### **Lines 10-11: Type Narrowing**

```typescript
const resolvedSupabaseUrl = supabaseUrl;
const resolvedSupabaseAnonKey = supabaseAnonKey;
```

**Why this extra step?**

```typescript
// Before:
supabaseUrl; // Type: string | undefined

// After validation:
resolvedSupabaseUrl; // Type: string (TypeScript knows it's definitely a string)
```

TypeScript's way of saying "we verified this is not null."

#### **Lines 13-19: The Core Function**

```typescript
export function createClerkSupabaseClient(
  getToken: () => Promise<string | null>,
) {
  return createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey, {
    async accessToken() {
      return getToken();
    },
  });
}
```

**Breaking it down:**

| Part                                      | Meaning                                          |
| ----------------------------------------- | ------------------------------------------------ |
| `getToken: () => Promise<string \| null>` | A function that returns a Promise of JWT or null |
| `async accessToken()`                     | Supabase calls this when it needs a fresh token  |
| `return getToken()`                       | Get the token from Clerk                         |

**Why `async accessToken()`?**

```
Scenario 1: Synchronous (WRONG)
────────────────────────────────
1. getToken() might take 100ms to get token from network
2. accessToken() needs to wait for it
3. But synchronous code can't wait
4. ❌ Crashes or returns undefined

Scenario 2: Asynchronous (CORRECT)
────────────────────────────────
1. accessToken() is async
2. It can wait for getToken() to finish
3. Supabase knows to await accessToken()
4. ✓ Gets fresh token every time
```

**Token Refresh Timeline:**

```
First Query (fresh login):
  User calls: db.from("users").select()
  Supabase calls: accessToken()
  accessToken() returns: "eyJhbGc..." (fresh JWT, expires in 1 hour)
  Query succeeds ✅

30 minutes later, another query:
  Supabase calls: accessToken()
  accessToken() returns: Same JWT (still valid)
  Query succeeds ✅

65 minutes later, another query:
  Supabase calls: accessToken()
  Clerk detects: JWT expired!
  Clerk refreshes: New JWT issued
  accessToken() returns: "eyJuZXc..." (new JWT)
  Query succeeds ✅
```

---

### The File: hooks/useSupabase.ts

```typescript
import { createClerkSupabaseClient } from "@/lib/supabase";
import { useAuth } from "@clerk/expo";
import { useMemo } from "react";

export function useSupabase() {
  const { getToken } = useAuth();

  const client = useMemo(() => createClerkSupabaseClient(() => getToken()), []);

  return client;
}
```

### Line-by-Line Explanation

#### **Line 6: Extract Token Function**

```typescript
const { getToken } = useAuth();
```

**What is `getToken`?**

```typescript
// When you call it:
const token = await getToken();

// It returns:
// "eyJhbGc..." (JWT)
// OR
// null (if not signed in)
```

**What does Clerk do internally?**

```
getToken():
  ↓
  Check: Do we have a valid JWT?
  ↓
  Yes → Return it
  ↓
  No → Is there a refresh token?
    ↓
    Yes → Use it to get new JWT, return it
    ↓
    No → User not signed in, return null
```

#### **Lines 8-11: useMemo Caching**

```typescript
const client = useMemo(() => createClerkSupabaseClient(() => getToken()), []);
```

**What is useMemo?**

It's a React hook that caches values:

```
Without useMemo:
┌─────────────────────────────────────┐
│ Component Render #1                 │
│ → client = createClerkSupabaseClient()
│ → Create NEW client object          │
└─────────────────────────────────────┘
        ↓
┌─────────────────────────────────────┐
│ Component Render #2                 │
│ → client = createClerkSupabaseClient()
│ → Create DIFFERENT client object    │
│ ❌ Memory waste!                    │
└─────────────────────────────────────┘

With useMemo:
┌─────────────────────────────────────┐
│ Component Render #1                 │
│ → useMemo runs function             │
│ → Create client object #1           │
│ → Cache it                          │
└─────────────────────────────────────┘
        ↓
┌─────────────────────────────────────┐
│ Component Render #2                 │
│ → useMemo skips function            │
│ → Return cached client #1           │
│ ✓ Same object, no waste!            │
└─────────────────────────────────────┘
```

**Performance Impact:**

- Without: 100 renders = 100 client objects = slow
- With: 100 renders = 1 client object = fast

#### **Why Empty Dependencies `[]`?**

```typescript
useMemo(() => ..., [])  // Never recreate
```

**What if we included `getToken`?**

```typescript
useMemo(() => ..., [getToken])  // Recreate when getToken changes
```

**Problem:**

- `getToken` is a function reference
- Every time Clerk re-renders, `getToken` changes (new reference)
- useMemo would recreate client EVERY render
- Defeats the purpose!

**Why it's safe to ignore `getToken`:**

```typescript
// The client holds this callback:
const client = createClerkSupabaseClient(() => getToken());

// Even if getToken changes in the parent component:
// The OLD client still has a reference to call it
// When Supabase needs a token, it calls the callback
// The callback uses the LATEST getToken from scope

// Timeline:
Render #1:
  getToken = function1
  client captures: () => getToken() // saves reference to getToken

Render #2:
  getToken = function2 (new reference!)
  client still exists: () => getToken() // but getToken now refers to function2
  When callback runs, it calls function2
```

---

## useUserSync Hook

### Purpose

Synchronizes Clerk user data with Supabase database on every login.

### File: hooks/useUserSync.ts

```typescript
import { useSupabase } from "@/hooks/useSupabase";
import { useUser } from "@clerk/expo";
import { useEffect } from "react";
import { useUserStore } from "../store/userStore";

export const useUserSync = () => {
  const { user } = useUser();
  const setCurrency = useUserStore((state) => state.setCurrency);
  const setNeedsOnboarding = useUserStore((state) => state.setNeedsOnboarding);
  const authSupabase = useSupabase();

  useEffect(() => {
    if (!user) return;

    const syncUser = async () => {
      try {
        // STEP 1: Check if user exists in Supabase
        const { data: existingUser, error: fetchError } = await authSupabase
          .from("users")
          .select("clerk_id, currency")
          .eq("clerk_id", user.id)
          .single();

        if (fetchError && fetchError.code !== "PGRST116") {
          console.error("Error fetching user:", fetchError);
          setNeedsOnboarding(true);
          return;
        }

        // STEP 2: If user exists, load their currency
        if (existingUser) {
          setCurrency(existingUser.currency ?? "INR");
          setNeedsOnboarding(!existingUser.currency);
          return;
        }

        // STEP 3: If user doesn't exist, create them
        const email = user.emailAddresses[0].emailAddress;

        const { data: newUser, error: insertError } = await authSupabase
          .from("users")
          .upsert(
            {
              clerk_id: user.id,
              email,
              name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
              image_url: user.imageUrl,
            },
            { onConflict: "clerk_id", ignoreDuplicates: false },
          )
          .select("currency")
          .single();

        if (insertError) {
          console.error("Error upserting user:", insertError);
          setNeedsOnboarding(true);
          return;
        }

        setCurrency(newUser?.currency ?? "INR");
        setNeedsOnboarding(!newUser?.currency);

        // STEP 4: Create default account for new user
        const { error: accountError } = await authSupabase
          .from("accounts")
          .insert({
            user_id: user.id,
            name: "Cash",
            type: "CASH",
            balance: 0,
            is_default: true,
          });

        if (accountError) {
          console.error("Error creating default account:", accountError);
        }
      } catch (e) {
        console.error("Unexpected sync error:", e);
        setNeedsOnboarding(true);
      }
    };

    syncUser();
  }, [user?.id]);
};
```

### Step-by-Step Breakdown

#### **Step 1: Get User from Clerk**

```typescript
const { user } = useUser();  // Returns Clerk user object

// user contains:
{
  id: "user_123",
  emailAddresses: [{ emailAddress: "john@email.com" }],
  firstName: "John",
  lastName: "Doe",
  imageUrl: "https://..."
}
```

#### **Step 2: Check if User Exists in Supabase**

```typescript
const { data: existingUser, error: fetchError } = await authSupabase
  .from("users") // Query "users" table
  .select("clerk_id, currency") // Get these columns only
  .eq("clerk_id", user.id) // WHERE clerk_id = this user's ID
  .single(); // Expect exactly one row
```

**What happens:**

```
Database Query:
SELECT clerk_id, currency FROM users WHERE clerk_id = 'user_123'

Result:
If found: { clerk_id: "user_123", currency: "USD" }
If not found: null
If error: { error: { code: "PGRST116" } }
```

**Error code "PGRST116":** "No rows found" - this is NOT an error, just no data yet

#### **Step 3: Load Existing Currency or Create User**

**If user exists:**

```typescript
if (existingUser) {
  setCurrency(existingUser.currency ?? "INR"); // Use their currency or default
  setNeedsOnboarding(!existingUser.currency); // Need onboarding if no currency
  return;
}
```

**If user doesn't exist, create them:**

```typescript
const { data: newUser, error: insertError } = await authSupabase
  .from("users")
  .upsert(
    {
      clerk_id: user.id, // Link to Clerk user
      email, // Their email
      name: "John Doe", // Their name
      image_url: "https://...", // Their avatar
    },
    { onConflict: "clerk_id", ignoreDuplicates: false },
  )
  .select("currency") // Return currency field
  .single();
```

**What `upsert` does:**

```
"If this clerk_id exists: update it"
"If this clerk_id doesn't exist: insert it"
```

#### **Step 4: Create Default Cash Account**

```typescript
const { error: accountError } = await authSupabase.from("accounts").insert({
  user_id: user.id, // This user's ID
  name: "Cash", // Account name
  type: "CASH", // Account type
  balance: 0, // Initial balance
  is_default: true, // This is their main account
});
```

Every user needs at least one account to track money.

### Flow Diagram

```
User Signs Up
  ↓
Clerk Issues JWT
  ↓
App Loads, RootGroupLayout runs
  ↓
useUserSync() called
  ↓
useEffect runs (because user?.id changed)
  ↓
Try to find user in Supabase by clerk_id
  ↓
  ├─→ User exists?
  │   ├─→ YES: Load currency from DB
  │   │        Update Zustand
  │   │        Done! ✅
  │   │
  │   └─→ NO: Create user in Supabase
  │           Copy data from Clerk
  │           Create default Cash account
  │           Set currency to INR (default)
  │           Update Zustand
  │           Done! ✅
  ↓
Zustand store updated with currency and onboarding status
  ↓
RootGroupLayout re-renders
  ↓
  └─→ if needsOnboarding → redirect to onboarding screen
  └─→ else → show home screen
```

---

## Zustand Store

### What is Zustand?

A state management library. Alternative to Redux/Context API.

**Why Zustand?**

- ✅ Simpler than Redux
- ✅ Less boilerplate
- ✅ Faster than Context API
- ✅ Works well for small-to-medium apps

### File: store/userStore.ts

```typescript
import { create } from "zustand";

interface UserStore {
  currency: string;
  setCurrency: (value: string) => void;
  needsOnboarding: boolean | null;
  setNeedsOnboarding: (value: boolean | null) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  currency: "INR",
  setCurrency: (value) => set({ currency: value }),
  needsOnboarding: null,
  setNeedsOnboarding: (value) => set({ needsOnboarding: value }),
}));
```

### Breaking It Down

#### **Interface Definition**

```typescript
interface UserStore {
  currency: string; // Store value
  setCurrency: (value: string) => void; // Update function
  needsOnboarding: boolean | null; // Store value (null = unknown)
  setNeedsOnboarding: (value: boolean | null) => void; // Update function
}
```

Defines the shape of the store. TypeScript checks that we implement all of these.

#### **Store Creation**

```typescript
export const useUserStore = create<UserStore>((set) => ({
  // Initial values
  currency: "INR",
  setCurrency: (value) => set({ currency: value }),

  needsOnboarding: null,
  setNeedsOnboarding: (value) => set({ needsOnboarding: value }),
}));
```

**What is `(set) => (...)`?**

`set` is a function that updates the store:

```typescript
// Old value
currency: "INR";

// Update it:
setCurrency("USD");

// Internally:
set({ currency: "USD" });

// Result:
currency: "USD";
```

### Usage in Components

```typescript
// Read currency
const currency = useUserStore((state) => state.currency);

// Update currency
const setCurrency = useUserStore((state) => state.setCurrency);

// In code:
setCurrency("USD");

// Read inside render:
function MyComponent() {
  const currency = useUserStore((state) => state.currency);
  const needsOnboarding = useUserStore((state) => state.needsOnboarding);

  return <Text>Currency: {currency}</Text>;
}
```

### Why `needsOnboarding: boolean | null`?

```typescript
null; // Not yet determined (loading from DB)
true; // User needs to set currency (no currency in DB yet)
false; // User completed onboarding (currency is set)
```

**Timeline:**

```
App starts:
  needsOnboarding = null (we don't know yet)
  RootGroupLayout: if (needsOnboarding === null) show loading spinner

useUserSync queries Supabase:
  Found currency in DB? Yes
  needsOnboarding = false (onboarding done)
  OR
  Found currency in DB? No
  needsOnboarding = true (show onboarding screen)

RootGroupLayout re-renders:
  if (needsOnboarding === false) show home
  if (needsOnboarding === true) show onboarding
```

---

## Onboarding Flow

### What is Onboarding?

The setup process after a user signs up.

In Welth, it means: **"Set your preferred currency"**

### Why Onboarding?

Your app tracks money. It needs to know:

- "Is this user tracking in USD, INR, EUR, etc?"
- Without this, transactions can't be displayed

### File: app/(root)/onboarding.tsx

```typescript
import React from "react";
import { Text, View } from "react-native";

const onboarding = () => {
  return (
    <View>
      <Text>onboarding</Text>
    </View>
  );
};

export default onboarding;
```

Currently just a placeholder. In a real app, it would show:

```typescript
// Example implementation:
const onboarding = () => {
  const setCurrency = useUserStore((state) => state.setCurrency);
  const setNeedsOnboarding = useUserStore((state) => state.setNeedsOnboarding);
  const supabase = useSupabase();
  const { user } = useUser();

  const handleSelectCurrency = async (currency: string) => {
    // Update Supabase
    await supabase
      .from("users")
      .update({ currency })
      .eq("clerk_id", user?.id);

    // Update Zustand
    setCurrency(currency);
    setNeedsOnboarding(false);

    // This triggers RootGroupLayout re-render
    // which now sees needsOnboarding = false
    // and redirects to home screen
  };

  return (
    <View>
      <Text>Select Your Currency</Text>
      <Button title="USD" onPress={() => handleSelectCurrency("USD")} />
      <Button title="INR" onPress={() => handleSelectCurrency("INR")} />
      <Button title="EUR" onPress={() => handleSelectCurrency("EUR")} />
    </View>
  );
};
```

### Flow

```
User signs up
  ↓
Clerk: Email verified ✓
  ↓
App redirects to /(root)/(tabs) home screen
  ↓
But RootGroupLayout runs first:
  ↓
  Check: needsOnboarding?
  ↓
  YES (no currency set)
  ↓
  Redirect: useRouter.push("/onboarding")
  ↓
Onboarding screen loads
  ↓
User selects currency "USD"
  ↓
App updates Supabase: SET currency = "USD"
  ↓
App updates Zustand: setCurrency("USD")
  ↓
App updates Zustand: setNeedsOnboarding(false)
  ↓
RootGroupLayout re-renders
  ↓
Check: needsOnboarding?
  ↓
  NO (currency is set)
  ↓
Redirect: home screen now loads ✓
```

---

## Complete Data Flow Timeline

### Full App Launch to Home Screen

```
Time: T0
─────────────────────────────────────────────────────────────
EVENT: App starts
ACTION: RootLayout (app/_layout.tsx) mounts
        ClerkProvider initializes
        Checks if user is signed in
RESULT: If signed in, isLoaded = true, isSignedIn = true

────────────────────────────────────────────────────────────
Time: T1
────────────────────────────────────────────────────────────
EVENT: User is signed in
ACTION: RootGroupLayout (app/(root)/_layout.tsx) mounts
        useUserSync hook called
        useEffect triggers (because user?.id changed)
RESULT: useUserSync starts executing

────────────────────────────────────────────────────────────
Time: T2
────────────────────────────────────────────────────────────
EVENT: useUserSync queries Supabase
ACTION: authSupabase.from("users").select(...).eq("clerk_id", user.id)
        Supabase internally:
          1. Calls accessToken()
          2. accessToken calls getToken()
          3. Clerk returns JWT: "eyJhbGc..."
          4. Supabase adds JWT to request
          5. Query sent to database
          6. Database verifies JWT with Clerk
RESULT: Database returns: { clerk_id: "user_123", currency: "USD" }
        OR: No rows (user doesn't exist)

────────────────────────────────────────────────────────────
Time: T3
────────────────────────────────────────────────────────────
EVENT: User found OR created in database
ACTION: setCurrency("USD") or setCurrency("INR")
        setNeedsOnboarding(false) or setNeedsOnboarding(true)
RESULT: Zustand store updated:
        { currency: "USD", needsOnboarding: false }

────────────────────────────────────────────────────────────
Time: T4
────────────────────────────────────────────────────────────
EVENT: Zustand state changed
ACTION: RootGroupLayout component re-renders
        Reads: needsOnboarding = false
        Reads: minLoadDone = true (after 1.5 sec delay)
RESULT: All conditions met for rendering home screen

────────────────────────────────────────────────────────────
Time: T5
────────────────────────────────────────────────────────────
EVENT: All checks pass
ACTION: RootGroupLayout returns: <Slot />
        Which renders child routes
        Route pattern: /(root)/(tabs)/
RESULT: Home screen loads! ✓

────────────────────────────────────────────────────────────
```

### If User Hasn't Completed Onboarding

```
T0-T2: Same as above
       ─────────

T3: Database returns: { clerk_id: "user_123", currency: null }
    New user, no currency set yet

ACTION: setCurrency("INR")  // default
        setNeedsOnboarding(true)  // NEEDS ONBOARDING

RESULT: Zustand store:
        { currency: "INR", needsOnboarding: true }

────────────────────────────────────────────────────────────

T4: RootGroupLayout re-renders
    Reads: needsOnboarding = true ✓
    Reads: pathname = "/(root)/(tabs)" (trying to go to home)

    Condition check:
    if (needsOnboarding && pathname !== "/onboarding")
      return <Redirect href="/(root)/onboarding" />

ACTION: Redirect to onboarding screen

────────────────────────────────────────────────────────────

T5: Onboarding screen loads
    User sees currency selection

────────────────────────────────────────────────────────────

T6: User selects currency "USD"
    App updates Supabase: SET currency = "USD" WHERE clerk_id = "user_123"
    App updates Zustand: setNeedsOnboarding(false)

ACTION: RootGroupLayout re-renders again

────────────────────────────────────────────────────────────

T7: RootGroupLayout re-renders
    Reads: needsOnboarding = false ✓
    Condition check fails:
    if (needsOnboarding && ...) ← FALSE now, so skip redirect

ACTION: Return <Slot />

────────────────────────────────────────────────────────────

T8: Home screen loads ✓
```

---

## Design Decisions Explained

### Why Separate lib/supabase.ts and hooks/useSupabase.ts?

| Aspect                   | Separation            | Benefits                                   |
| ------------------------ | --------------------- | ------------------------------------------ |
| **lib/supabase.ts**      | Configuration/factory | No React, can test independently, reusable |
| **hooks/useSupabase.ts** | React wrapper         | Hooks can only be used in components       |

**Bad: Mixing them**

```typescript
// In one file
export function useSupabase() {
  // React code here
  const { getToken } = useAuth();

  // Config code here
  return createClient(...);
}
```

**Problems:**

- Can't use without React
- Can't test without React environment
- Hard to reuse in non-React contexts

**Good: Separation**

```typescript
// lib/supabase.ts (pure function, no React)
export function createClerkSupabaseClient(getToken) { ... }

// hooks/useSupabase.ts (React hook)
export function useSupabase() {
  const { getToken } = useAuth();
  return useMemo(() => createClerkSupabaseClient(getToken), []);
}
```

**Benefits:**

- Can test lib/supabase.ts without React
- Can reuse in Node.js backend if needed
- Clean separation of concerns

---

### Why `async accessToken()` Instead of Passing Token Directly?

**Scenario A: Passing token directly (❌ WRONG)**

```typescript
export function createClerkSupabaseClient(token: string) {
  return createClient(url, key, {
    accessToken: token, // Fixed token
  });
}

// After 1 hour, token expires
// All queries fail: "Unauthorized"
// User has to restart app to get new token
// ❌ Bad user experience
```

**Scenario B: Using async callback (✅ CORRECT)**

```typescript
export function createClerkSupabaseClient(
  getToken: () => Promise<string | null>,
) {
  return createClient(url, key, {
    async accessToken() {
      return getToken(); // Fresh token every time
    },
  });
}

// Every query automatically gets fresh token
// Clerk handles refresh internally
// User never notices token expiry
// ✓ Seamless experience
```

---

### Why `useMemo` with Empty Dependencies?

**Without useMemo (❌ Performance issue)**

```
Component renders 10 times:
┌─ Render 1: createClient() → client1
├─ Render 2: createClient() → client2
├─ Render 3: createClient() → client3
├─ Render 4: createClient() → client4
├─ Render 5: createClient() → client5
├─ Render 6: createClient() → client6
├─ Render 7: createClient() → client7
├─ Render 8: createClient() → client8
├─ Render 9: createClient() → client9
└─ Render 10: createClient() → client10

Memory usage: 10 clients (waste!)
DB connection overhead: x10
```

**With useMemo (✅ Efficient)**

```
Component renders 10 times:
┌─ Render 1: useMemo runs → client1 → CACHE
├─ Render 2: useMemo skips → client1 (cached)
├─ Render 3: useMemo skips → client1 (cached)
├─ Render 4: useMemo skips → client1 (cached)
├─ Render 5: useMemo skips → client1 (cached)
├─ Render 6: useMemo skips → client1 (cached)
├─ Render 7: useMemo skips → client1 (cached)
├─ Render 8: useMemo skips → client1 (cached)
├─ Render 9: useMemo skips → client1 (cached)
└─ Render 10: useMemo skips → client1 (cached)

Memory usage: 1 client (efficient!)
DB connection overhead: 1x
```

---

### Why `getToken` Function Captured in Closure?

**The Problem: How does the client get fresh tokens?**

```
At T0 (Render 1):
  getToken = function1
  Create client with callback: () => getToken()
  Client "remembers" this callback

At T1 (Render 2):
  Clerk re-renders
  getToken = function2 (new reference!)

  BUT: client still exists (useMemo cached it)
  client calls its callback: () => getToken()

  Question: Which getToken does it call? function1 or function2?

  Answer: function2!
  Why? Because JavaScript closures capture VARIABLES, not VALUES
  getToken is a variable
  When the callback runs, it looks up the current value of getToken
  Which is now function2
```

**Timeline with Closure:**

```
Render #1
─────────
const getToken = () => "token_v1";
const client = createClient({
  accessToken: () => getToken()  // ← captures reference to getToken variable
});

First query:
  Supabase calls: accessToken()
  Returns: getToken() → "token_v1" ✓

─────────────────────────────────

Render #2
─────────
const getToken = () => "token_v2";  // New function
useMemo sees: [] deps unchanged
Returns: SAME CLIENT from Render #1

Second query:
  Supabase calls: SAME client's accessToken()
  Returns: getToken() → "token_v2" ✓
  (uses NEW getToken from current scope!)
```

**Why this works:**

- `getToken` is stored in function scope
- When callback runs, it reads the current value
- No need to recreate client when getToken changes

---

### Why Zustand Instead of Context API?

| Aspect      | Zustand                         | Context API                            |
| ----------- | ------------------------------- | -------------------------------------- |
| Boilerplate | ❌ Less                         | ✅ More                                |
| Performance | ✅ Faster (no provider wrapper) | ❌ Slower (re-renders all consumers)   |
| Usage       | ✅ Simple: `useUserStore()`     | ❌ Complex: wrap provider + useContext |
| Rerenders   | ✅ Only subscribed components   | ❌ All consumers re-render             |
| Testing     | ✅ Easy (plain functions)       | ❌ Harder (needs providers)            |

**Zustand Pattern:**

```typescript
const useStore = create((state) => ({
  value: 0,
  setValue: (v) => set({ value: v }),
}));

// In component:
const value = useStore((state) => state.value);
```

**Context Pattern:**

```typescript
const StoreContext = createContext();

function Provider({ children }) {
  const [value, setValue] = useState(0);
  return (
    <StoreContext.Provider value={{ value, setValue }}>
      {children}
    </StoreContext.Provider>
  );
}

// In component:
const { value } = useContext(StoreContext);
```

---

### Why Store Is Separate from useUserSync?

**Good separation:**

```typescript
// useUserSync = side effect (fetches from DB)
// Handles: "Get data from Supabase and update store"

// useUserStore = state container
// Handles: "Store and provide data"
```

**Why not combine them?**

```typescript
// ❌ BAD: Mixed concerns
export const useUserStoreAndSync = () => {
  // State management mixed with side effects
  const [currency, setCurrency] = useState("INR");

  useEffect(() => {
    // Fetch logic
    const data = await db.getUser();
    setCurrency(data.currency);
  }, []);

  return { currency, setCurrency };
};
```

**Problems:**

- Hard to test (entangled concerns)
- Can't reuse store without sync
- Can't reuse sync without store
- More complex to understand

**Good: Separated concerns**

```typescript
// Store: pure state container
export const useUserStore = create(...);

// Sync: side effect that updates store
export const useUserSync = () => {
  const setCurrency = useUserStore(...);

  useEffect(() => {
    const data = await db.getUser();
    setCurrency(data.currency);
  }, []);
};
```

**Benefits:**

- Easy to test each independently
- Can use store without sync
- Can use sync without store
- Clear responsibility

---

## Summary: Why This Architecture?

```
┌──────────────────────────────────────────────────────────────┐
│                      WELTH ARCHITECTURE                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Clerk (Authentication)                                      │
│  └─→ Provides: getToken() function                          │
│      └─→ JWT tokens + auto-refresh                          │
│                                                              │
│  useSupabase Hook (React wrapper)                            │
│  └─→ Calls: useAuth() to get getToken                       │
│  └─→ Creates: Supabase client (cached with useMemo)         │
│  └─→ Returns: Authenticated Supabase client                 │
│                                                              │
│  useUserSync Hook (Side effect)                              │
│  └─→ Uses: useSupabase + useUser                            │
│  └─→ Does: Queries DB, creates user if needed               │
│  └─→ Updates: Zustand store with currency/onboarding        │
│                                                              │
│  Zustand Store (State container)                             │
│  └─→ Holds: { currency, needsOnboarding }                   │
│  └─→ Fast: In-memory, no network                            │
│  └─→ Reactive: Components auto-update on change             │
│                                                              │
│  RootGroupLayout (Routing logic)                             │
│  └─→ Reads: Zustand store                                   │
│  └─→ Calls: useUserSync on mount                            │
│  └─→ Routes: To onboarding or home based on state            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Key Principles:**

1. **Separation of Concerns**
   - Auth (Clerk) ≠ Database (Supabase) ≠ App State (Zustand)

2. **Unidirectional Data Flow**
   - Clerk → useSupabase → useUserSync → Zustand → UI

3. **Caching & Performance**
   - Client created once (useMemo)
   - Store accessed directly (Zustand)
   - No unnecessary re-renders

4. **Automatic Token Refresh**
   - Closure captures getToken
   - Supabase calls it on each query
   - Clerk refreshes transparently

5. **Testability**
   - Each piece is testable independently
   - lib/supabase.ts needs no React
   - Zustand store is plain functions

---

## Quick Reference

### useForm

```typescript
const { control, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),  // Validation
  mode: "onBlur",                 // When to validate
  defaultValues: {...}            // Initial values
});
```

### Controller

```typescript
<Controller
  control={control}
  name="email"
  render={({ field: { value, onChange } }) => (
    <TextInput value={value} onChangeText={onChange} />
  )}
/>
```

### useSupabase

```typescript
const supabase = useSupabase();
const data = await supabase.from("users").select();
```

### Zustand

```typescript
const value = useUserStore((state) => state.value);
```

### Token Flow

```
Query → accessToken() → getToken() → Clerk → JWT → Query
```

### Onboarding Logic

```
Signup → useUserSync → Check DB → needsOnboarding? → Route accordingly
```

---

End of Architecture Guide
