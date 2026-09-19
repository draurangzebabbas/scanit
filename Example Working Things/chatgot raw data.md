Yes — and after checking the current Google/Supabase documentation, I would **change my recommendation slightly** based on what you want.

Your idea of separating the **frontend from Apps Script** is valid, and **Blogger can technically host the frontend over HTTPS**. But I would not choose Blogger as the production host for the entire frontend if we're trying to build a serious multi-user application.

The more important point is this:

> **You do NOT necessarily need Supabase just because you move to Next.js.**

And your Google authentication concern has an important distinction.

### 1. Supabase Free really does pause inactive projects

Current Supabase documentation says Free Plan projects can be paused after **1 week of inactivity**. A project can be resumed, but that's obviously not what you want for a production app. ([Supabase][1])

So if your requirement is:

> "I want people to be able to use this continuously without me paying for a backend that sleeps."

I would **not make Supabase Free the critical backend dependency**.

---

# 2. Google Sheets/Drive authentication does NOT normally mean "reconnect every 7 days"

This part is very important.

There are two different things:

### Access token

Short-lived.

Your application automatically gets a new access token using the refresh token.

### Refresh token

Long-lived under normal production OAuth circumstances.

So users don't normally have to reconnect Google every few days.

**BUT there is one major Google OAuth trap:**

If your OAuth application is configured as **Testing**, Google says refresh tokens for those authorizations expire after **7 days** (with some exceptions for basic identity-only scopes). ([Google for Developers][2])

So for your application:

```text
OAuth = Testing
       ↓
User connects Google
       ↓
7 days
       ↓
Authorization expires
       ↓
User must authorize again
```

That's obviously bad for a public production application.

Instead:

```text
Google OAuth
     ↓
Production / properly configured
     ↓
User authorizes
     ↓
Refresh token stored securely
     ↓
Application refreshes access tokens automatically
     ↓
User doesn't repeatedly reconnect
```

There can still be revocation/expiration scenarios—for example, a user can revoke access—but **7-day expiration is specifically associated with the Testing status**, not simply "using Google Sheets API." ([Google for Developers][2])

---

# 3. Now your Blogger idea

This is where your idea gets interesting.

Blogger supports custom HTML/JavaScript, and Blogger sites can be served over HTTPS. ([Google Help][3])

So technically you could do:

```text
                  Blogger
                     │
                     │ HTTPS
                     ▼
             Product Hunting UI
                     │
                     │ API requests
                     ▼
              Apps Script
                backend
                /     \
               /       \
              ▼         ▼
        Google Sheets  Google Drive
```

And **yes, this could work**.

Your camera would no longer be inside the Apps Script HTML Service iframe.

The browser would load:

```text
https://yourapp.blogspot.com
```

directly.

Then:

```javascript
navigator.mediaDevices.getUserMedia(...)
```

would be running in the **Blogger page**, not Apps Script HTML Service.

That removes the specific Apps Script camera sandbox problem.

---

# 4. But there is a BIG distinction

I would separate these two questions:

### Can Blogger host the frontend?

**Yes.**

### Is Blogger the best production platform for the application?

**I wouldn't choose it as the long-term architecture.**

Why?

Because you're not really building a blog.

You're building:

> a multi-user SaaS-style application.

You need things such as:

* authentication
* user accounts
* Google OAuth
* Google Drive authorization
* Google Sheets authorization
* secure tokens
* API endpoints
* permissions
* rate limiting
* error handling
* potentially background jobs
* potentially database storage
* application configuration
* scalable backend

Blogger is primarily a publishing platform with HTML/JS customization, not an application backend.

---

# 5. What about keeping Apps Script as the backend?

This is actually possible.

You could make:

```text
Frontend
Blogger
   │
   │ HTTPS requests
   ▼
Apps Script Web App
   │
   ├── Google Sheets
   └── Google Drive
```

And this could be **very cheap**.

But I don't want you to think:

> "Apps Script is free forever and unlimited users."

That's not correct.

Google Apps Script has quotas and execution limits. For example, Google's current documentation lists limits such as **6 minutes per execution**, 30 simultaneous executions per user, and 1,000 simultaneous executions per script, alongside daily service quotas. Google also says quotas can change. ([Google for Developers][4])

So:

```text
100 users
```

might be perfectly fine depending on usage.

But:

```text
10,000 users
```

doing heavy operations simultaneously is a very different situation.

The bottleneck isn't simply "number of registered users."

It's:

> **how many executions/API operations those users generate.**

---

# 6. There's another important issue with your proposed architecture

Suppose you make:

```text
Blogger
   ↓
Apps Script
   ↓
Google Drive
```

and **every user is using your Google authorization**.

Then you potentially end up with:

```text
100 users
     ↓
your Apps Script
     ↓
YOUR Google account
     ↓
YOUR Drive
     ↓
YOUR Sheets
```

That's probably **not what you ultimately want**.

Because then your application is effectively one shared Google account/backend.

Instead, for a true public application, you want:

```text
User A
   ↓
Google OAuth
   ↓
User A's Google Drive/Sheets

User B
   ↓
Google OAuth
   ↓
User B's Google Drive/Sheets

User C
   ↓
Google OAuth
   ↓
User C's Google Drive/Sheets
```

That's where a proper Next.js backend becomes much more attractive.

---

# 7. So I see three possible architectures

## Option A — Current Apps Script architecture

```text
Apps Script frontend
        +
Apps Script backend
        +
Sheets
        +
Drive
```

### Pros

* Very simple
* Extremely cheap
* Already mostly built
* Google integration is easy

### Cons

* Camera restriction
* Apps Script HTML sandbox
* Apps Script quotas
* Less control
* Not ideal as a public SaaS frontend

---

# Option B — Blogger + Apps Script

```text
Blogger
   ↓
Apps Script Web App
   ↓
Sheets + Drive
```

### Pros

* Very cheap
* HTTPS frontend
* Camera can run on Blogger page
* We can reuse a lot of your existing Apps Script backend
* Fastest path from where we are now
* No separate Scanner.html needed
* No Supabase required

### Cons

* Still dependent on Apps Script backend
* Apps Script quotas
* Authentication architecture gets complicated for public users
* Blogger isn't designed as a modern application frontend
* Eventually we'd probably want to migrate away

### For a prototype/internal tool?

**Very reasonable.**

---

# Option C — Next.js application

```text
                 Next.js
             /             \
        Frontend           Backend
             \             /
              Google OAuth
                   │
          ┌────────┴────────┐
          ▼                 ▼
      Sheets API        Drive API
```

### Pros

* Proper camera access
* Proper web application
* Excellent mobile support
* Better routing
* Better UI
* Better security architecture
* Proper Google OAuth
* Easier to scale
* No Apps Script dependency
* No Blogger dependency
* Can eventually add database
* Can eventually add subscriptions
* Can eventually add teams/users
* Much better long-term foundation

### Cons

* More initial work
* Google OAuth implementation is more involved
* Need hosting
* Need to manage backend
* More architecture than Apps Script

---

# 8. And here's what I would actually do

Because you said:

> **"I want everyone to be able to use it."**

I would **not build the final architecture around Blogger + Apps Script**.

I'd build:

```text
                NEXT.JS
                   │
        ┌──────────┴──────────┐
        │                     │
     Browser              Server
        │                     │
    Camera                  OAuth
    Scanner                  │
    Photos                   │
        │             Google APIs
        │                /      \
        │               /        \
        └──────────────► Sheets   Drive
```

And **don't add Supabase initially unless we actually need it.**

---

# 9. We can actually avoid Supabase for V1

This is the part I think is most useful for you.

You were thinking:

> Next.js → Supabase → Google APIs

It doesn't have to be that.

We can start:

```text
Next.js
   │
   ├── Frontend
   ├── Backend/API
   ├── Google OAuth
   ├── Google Sheets API
   └── Google Drive API
```

No Supabase.

Then if we later need:

```text
users
subscriptions
teams
saved searches
permissions
analytics
application settings
```

we introduce PostgreSQL/Supabase or another database.

That means you're not introducing a sleeping backend **before you actually need one**.

---

# 10. What about hosting Next.js for free?

This is where we should distinguish **frontend hosting** from **database/backend hosting**.

A Next.js application can be deployed to a platform that runs the application without requiring a Supabase database.

For example:

```text
Next.js hosting
       +
Google APIs
```

The Google APIs are the actual external data services.

So your architecture could initially be:

```text
                   Internet
                      │
                      ▼
              Next.js application
                      │
              ┌───────┴────────┐
              ▼                ▼
        Google OAuth      Google APIs
                              │
                       ┌──────┴──────┐
                       ▼             ▼
                    Sheets         Drive
```

No Supabase.

---

# 11. What I'd do with your existing application

I **wouldn't throw away what we've built**.

We already have:

* Product dashboard
* Settings
* Google Sheet connection
* Google Drive connection
* Dynamic product fields
* Product entry
* UPC
* Photos
* Drive hierarchy
* Product folder
* Record ID
* Save Product
* Save & Scan Next
* etc.

I'd use the current Apps Script code as the **functional specification** and migrate it.

For example:

```text
CURRENT                         NEXT.JS

Code.gs                    →    Google API server layer

Index.html                 →    React/Next.js pages

PropertiesService          →    server-side configuration

google.script.run          →    Next.js API/server actions

SpreadsheetApp             →    Google Sheets API

DriveApp                   →    Google Drive API

Scanner.html               →    React camera component

ZXing                      →    ZXing
```

So we're not starting from zero.

---

# 12. Where Blogger DOES make sense

I actually like your Blogger idea for **one particular use case**:

### Temporary/rapid prototype

We could potentially take your current frontend and put it on:

```text
Blogger HTTPS
```

then:

```text
Blogger frontend
       ↓
Apps Script backend
       ↓
Sheets + Drive
```

and test:

* camera
* UPC scanning
* product saving
* photos
* Drive
* Sheets
* multiple browsers
* phones

**very quickly.**

Blogger supports HTTPS, including automatic HTTPS for Blogspot addresses. ([Google Help][3])

So as a **quick experiment**, I think your idea is worth testing.

But I would treat it as:

> **Proof of concept / transitional architecture**

rather than committing the entire future application to Blogger.

---

# My recommendation for you

Given your priorities:

### If priority is **"get camera working today with minimum changes"**

Use:

**Blogger → Apps Script → Sheets/Drive**

and test it.

### If priority is **"build the actual public product that anyone can use"**

Use:

**Next.js → Google OAuth → Sheets/Drive**

and initially **skip Supabase**.

### If priority is **"build a full SaaS eventually"**

Use:

**Next.js → PostgreSQL/Supabase → Google APIs**

but introduce Supabase when we actually need persistent application data.

---

## One thing I would NOT do

I would **not** build:

```text
Blogger
   ↓
Next.js
   ↓
Supabase
   ↓
Apps Script
   ↓
Google APIs
```

That's too many layers.

You'd be creating complexity just to work around problems caused by the previous architecture.

Instead, choose a clean direction.

### My preferred final architecture:

```text
                         PRODUCT HUNTING
                              │
                         Next.js App
                              │
                ┌─────────────┴─────────────┐
                │                           │
             Browser                    Next.js Server
                │                           │
        ┌───────┴───────┐                   │
        │               │                   │
      Camera          Photos          Google OAuth
      ZXing             │                   │
        │               │                   │
        └───────────────┴───────────────────┘
                                │
                         Google APIs
                          /         \
                         /           \
                    Sheets           Drive
```

**No Apps Script. No Blogger. No Supabase initially.**

Then later:

```text
                         Next.js
                            │
                      PostgreSQL
                            │
                 ┌──────────┴─────────┐
                 ▼                    ▼
             Google APIs          Application data
                 │
            Sheets / Drive
```

That gives you a real application architecture without paying for infrastructure you don't yet need.

And importantly, **Google OAuth must be configured properly for production**, not left in Google's "Testing" state, if you want users' Google authorizations to avoid the documented 7-day testing-token expiration. ([Google for Developers][2])

If your immediate goal is **"let's test the camera today with the least work"**, though, I agree with you: **putting the frontend on a Blogger HTTPS page and keeping the existing Apps Script backend is a very fast experiment**, and it can tell us whether the whole camera/Sheets/Drive flow works before we commit to the Next.js migration. ([Google Help][3])

[1]: https://supabase.com/docs/guides/platform/free-project-pausing?utm_source=chatgpt.com "Project Pausing | Supabase Docs"
[2]: https://developers.google.com/identity/protocols/oauth2?utm_source=chatgpt.com "Using OAuth 2.0 to Access Google APIs  |  Authorization  |  Google for Developers"
[3]: https://support.google.com/blogger/answer/6284029?hl=en&utm_source=chatgpt.com "Turn on HTTPS for your blog - Blogger Help"
[4]: https://developers.google.com/apps-script/guides/services/quotas?authuser=3&utm_source=chatgpt.com "Quotas for Google Services  |  Apps Script  |  Google for Developers"
