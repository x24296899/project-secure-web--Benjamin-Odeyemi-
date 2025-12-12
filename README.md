# project-secure-web--Benjamin-Odeyemi-

This repository contains a small static front-end preview of a "Secure Web" app.

Files of interest
- `index.html`, `login.html`, `register.html`, `base.html` — static preview pages (HTML)
- `style.css` — stylesheet used by the preview pages

Quick ways to view the preview locally

1) Open in your browser (no server required)
	 - Double-click `index.html` in File Explorer or run in PowerShell:

		 Start-Process "$(Resolve-Path .\index.html)"

2) Serve with a tiny local static server (optional)
	 - If you have Python installed (recommended), run from the repo root:

		 # PowerShell
		 python -m http.server 8000

		 Then open http://127.0.0.1:8000 in your browser.

	 - If you have Node.js installed, you can install a static server and run it:

		 npm install -g serve
		 serve -s . -l 8000


