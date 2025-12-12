
# Secure Web — Client-side Restaurant Booking 
## Quick start

- Open `index.html` in your browser. That opens the app UI.

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

## User roles and permissions 

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

## Where to look in the code

- `users.js` — user logic and session helpers.
- `reservations.js` — tables/reservations and availability logic.
- `register.html`, `login.html`, `admin-*.html`, `reservations.html` .



