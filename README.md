# BigQuery Release Notes Hub & Twitter (X) Sharer

A modern, responsive, and lightweight Python Flask web application that fetches Google Cloud BigQuery release notes from the official Atom XML feed, divides combined updates into isolated cards, filters/searches them instantly, and lets you compose and tweet individual updates with precise character limit calculations.

---

## 🌟 Features

* **Daily Feed segmentation**: Automatically splits combined daily release notes by header (e.g. `Feature`, `Change`, `Deprecation`) into clean, readable cards.
* **Smart Server Caching**: Caches notes in memory to load instantly on refresh, with automatic warning fallback to cached entries if the remote fetch fails.
* **Instant Filtering & Search**: Filter releases by type (Features, Changes, Deprecations) and search using keywords in real-time on the client side.
* **Custom Twitter (X) Composer**: 
  * Pre-formats update details with hashtags and reference links.
  * Employs X's official URL length rules (every URL is computed as exactly 23 characters) to guarantee a correct character count.
  * Visually displays character limit progress using a dynamic circular progress ring.
* **Modern Top-Layer Dialogs**: Employs the native HTML5 `<dialog>` component with CSS `@starting-style` transitions for smooth animations and backdrop dismissals.

---

## 🛠️ Project Structure

```text
bq-release-notes/
├── app.py                   # Flask server-side feed fetching, parsing & caching logic
├── templates/
│   └── index.html           # Core HTML layout, modal windows & script loader
├── static/
│   ├── css/
│   │   └── style.css        # Space-dark glassmorphic theme & top-layer transitions
│   └── js/
│       └── main.js          # REST Client, UI rendering, search filters & Tweet limits
├── .gitignore               # Ignored environments, cache and editor system files
└── README.md                # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
* Python 3.8 or higher installed on your system.

### 1. Clone & Navigate
Navigate to the project root directory:
```bash
cd /home/nazmul/LLMs/Kaggle-Agy-Tutorial/Day-02/agy-cli-projects/bq-release-notes
```

### 2. Set Up Virtual Environment & Dependencies
Create a virtual environment and install the required modules:
```bash
# Create venv
python3 -m venv venv

# Activate and install dependencies
source venv/bin/activate
pip install Flask requests
```

### 3. Run the Development Server
Run the Flask server:
```bash
python3 app.py
```
By default, the application will start in debug mode on **`http://localhost:5000`**.

---

## 📝 Technologies Used
* **Backend**: Python, Flask, Standard ElementTree Parser, Requests, Regex.
* **Frontend**: HTML5, Vanilla JavaScript (ES6+), Vanilla CSS (Variables, Grid, `@starting-style`, top-layer transitions).
* **Icons**: [Lucide Icons](https://lucide.dev) via CDN.

---

## 🔒 Security & Best Practices
* **Token Safety**: Do not commit personal access tokens or keys to your repository.
* **Cleanups**: Standard `.gitignore` is included to block local cache files and Python virtual environments from leaking into Git.
