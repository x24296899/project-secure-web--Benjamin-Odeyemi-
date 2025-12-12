
# Secure Web — Client-side Restaurant Booking Demo

This repository is a client-only, static demo of a small restaurant booking
application implemented with plain HTML/CSS and vanilla JavaScript. All
data and authentication are stored locally in the browser using IndexedDB so
you can run the app without a backend server.

## Quick start

- Open `index.html` in your browser. That opens the app UI.
- If your browser blocks ES module imports when opened via `file://`, serve
	the folder over HTTP. A simple way (if you have Python installed) is:

```powershell
# from the project root
python -m http.server 3000
# then open http://localhost:3000/index.html
```

Or use any static file server / editor extension (VS Code Live Server, etc.).

## Project overview

This is a single-page / multi-page static app that demonstrates:

- Local user registration and login (stored in the browser)
- A reservations system (create, list, cancel)
- Admin pages to view users, tables, and all reservations
- Simple client-side session handling for demo purposes

Files of interest
- `users.js` — user account CRUD, password hashing (WebCrypto SHA-256),
	session helpers, and failed-login tracking.
- `reservations.js` — tables and reservations IndexedDB store with CRUD and
	availability checks.
- `register.html`, `login.html`, `reservations.html`, `dashboard.html`,
	`admin.html`, `admin-users.html`, `admin-tables.html`, `admin-reservations.html`
	— the main pages and admin interface.

## Features

- Register with email + password and password confirmation UI.
- Login with client-side verification against the locally stored user.
- 3-attempt lockout tracked in `localStorage` (temporary, client-side).
- Create and view reservations; availability checks are performed in the
	browser using `reservations.js`.
- Admin UI to manage tables and view or cancel any reservation.

## Security controls implemented (front-end)

The app is a demo; the following mitigations were applied at the front-end
level to improve safety for a client-side demo:

- Content Security Policy (CSP) meta tag present in pages (restricts sources).
- Safe DOM updates: UI rendering uses `createElement` and `textContent`
	instead of `innerHTML` wherever possible, which prevents HTML injection.
- Simple session markers stored in `sessionStorage` (tab-local) and a
	convenience cookie with `SameSite=Strict` for cross-tab detection.
- Password rules and confirmation UI to guide stronger passwords.
- Client-side lockout (localStorage) to slow brute-force attempts in the demo.

 

## Pages structure and purpose

- `index.html` — landing page and header/navigation.
- `register.html` — registration form with password requirements and confirm.
- `login.html` — login form with client-side lockout handling.
- `reservations.html` — user-facing reservation creation and listing page.
- `dashboard.html` — user profile and quick links.
- `admin.html`, `admin-users.html`, `admin-tables.html`, `admin-reservations.html`
	— admin interfaces to view/manage users, tables, and reservations.
- `users.js` — client-side user store and session helpers.
- `reservations.js` — tables and reservations store plus availability logic.
- `style.css` — visual styling.

## User roles and permissions (client-side)

- Two roles exist in the demo: `admin` and `user`.
- Role is stored on the user record in IndexedDB. Admin-only pages check the
	logged-in user's role in JavaScript and redirect to `login.html` if not
	authorized.


## Data storage (IndexedDB)

- Users: stored in an IndexedDB database (`secure_web_db`) in the `users`
	object store. Each user record contains at least: `email`, `passwordHash`,
	`role`, and `createdAt`.
- Tables & Reservations: stored in a separate IndexedDB database (`restaurant_db`)
	in `tables` and `reservations` object stores.
- All data is persisted locally in the browser profile that used the app.
	There is no server or centralized persistence — data does not sync across
	devices or browsers.

## Limitations and important notes

- This is a client-side demo; it is not secure for production. The main
	limitations are:
	- Password hashing is done in the browser using a single SHA-256 digest
		(no per-user salt or iterations). This is weak compared to server-side
		KDFs (bcrypt/argon2).
	- Sessions are implemented with `sessionStorage` and a JS-set cookie. The
		cookie is not HttpOnly and can be accessed by scripts if an XSS bug
		exists.
	- Role checks and authorization are enforced only in client JavaScript and
		can be bypassed by a user who modifies the client code.
	- Availability checks for reservations are not atomic across multiple
		browser tabs; race conditions (double-booking) are possible in concurrent
		usage.
	- All data lives in the browser's IndexedDB and can be cleared by the
		user or lost when the browser profile is removed.

## Suggested next steps (if you want to make this production-ready)

1. Move authentication and data storage to a server with a proper database.
2. Use a server-side password hashing algorithm (bcrypt/argon2) with per-user
	 salts.
3. Use HttpOnly, Secure cookies for sessions and enforce server-side role
	 checks on all sensitive endpoints.
4. Implement atomic reservation logic on the server to avoid double-booking.

## Where to look in the code

- `users.js` — user logic and session helpers.
- `reservations.js` — tables/reservations and availability logic.
- `register.html`, `login.html`, `admin-*.html`, `reservations.html` — UI pages.



