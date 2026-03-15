# StockSense Hub

StockSense Hub is a lightweight **stock analysis and portfolio tracking platform** designed to help users monitor market activity, evaluate technical indicators, and manage investment alerts from a single dashboard.

The platform combines a **Vanilla JavaScript frontend** with a **serverless backend powered by Google Apps Script and Google Sheets**, creating a fast and accessible stock analysis environment without traditional server infrastructure.

StockSense Hub is primarily built for **educational use, experimentation, and learning financial data analysis concepts.**

![Status](https://img.shields.io/badge/Status-Active%20Development-success)
![License](https://img.shields.io/badge/License-MIT-blue)

---

# 🚀 Key Features

## 📊 Portfolio Management

* Track multiple stocks with **quantity and purchase price**
* Automatic **real-time profit and loss calculation**
* Visual **profit/loss indicators with dynamic color states**
* Local browser storage for fast session persistence
* Google Sheets synchronization through Apps Script
* Prediction signals displayed directly alongside holdings

---

## 📈 Technical Analysis Engine

StockSense Hub includes a custom **Alpha+ prediction engine** built entirely using deterministic mathematical models.

Indicators currently supported include:

* Relative Strength Index (**RSI**)
* Moving Average Convergence Divergence (**MACD**)
* Bollinger Bands
* Moving Averages
* Trend and momentum evaluation

The system generates **signal suggestions such as BUY, SELL, or HOLD** based on combined indicator analysis.

Market data refreshes automatically every **60 seconds**.

See detailed documentation:
`PREDICTION_GUIDE.md`

---

## 📊 Interactive Market Charts

Charts are rendered using **Chart.js** for responsive and interactive visualization.

Capabilities include:

* Line and Area charts
* Multiple historical ranges

  * 1 Month
  * 3 Months
  * 1 Year
  * All Time
* Smooth gradients and dynamic tooltips
* Responsive layout optimized for modern browsers

---

## 🔔 Automated Alert System

The platform includes a **serverless alert engine** powered by Google Apps Script.

Users can create alerts based on:

* Minimum price thresholds
* Maximum price thresholds
* Generic above/below price triggers

When conditions are met, the system automatically sends **email notifications**.

Alerts are validated and processed using:

* `alertengine.gs`
* Google Apps Script time-driven triggers

---

## 🎨 User Interface

StockSense Hub uses a clean UI focused on readability and performance.

Features include:

* Dark and Light mode using CSS variables
* Glassmorphism-based interface styling
* Lightweight DOM updates
* Responsive layout
* Real-time UI updates during asynchronous data fetch operations

---

# 🛠️ Technology Stack

## Frontend

* HTML5
* CSS3
* Vanilla JavaScript (ES6 modules)
* Chart.js for data visualization
* Phosphor Icons

Core frontend modules:

* `app.js` — application logic
* `api.js` — API communication layer
* `storage.js` — local persistence
* `prediction.js` — technical analysis engine

---

## Backend (Serverless)

The backend is implemented entirely using **Google Apps Script**, which removes the need for traditional servers while still enabling secure data handling and automation.

Backend components include:

* `code.gs` — main API routing and stock query logic
* `alertengine.gs` — alert monitoring and email notifications

### Database

Google Sheets is used as a lightweight database.

Worksheets include:

* `Stocks`
* `Alerts`
* `AlertHistory`

### External Data Source

Market data is fetched from:

* **Finnhub API**

---


# � Mobile Compatibility

StockSense Hub is **fully responsive and mobile-optimized** with:

- **Touch-friendly interface** with 44px minimum touch targets
- **Adaptive layouts** for phones, tablets, and desktops
- **iOS Safari optimized** (prevents zoom on input focus)
- **Android Chrome compatible** with smooth scrolling
- **Landscape mode support** for better mobile experience
- **Gesture-friendly navigation** and interactions

---

# 🌐 GitHub Pages Deployment

You can deploy StockSense Hub directly to GitHub Pages for free hosting:

## Quick Deploy Steps:

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for GitHub Pages deployment"
   git push origin main
   ```

2. **Enable GitHub Pages:**
   - Go to your repository on GitHub
   - Click **Settings** → **Pages**
   - Source: **Deploy from a branch**
   - Branch: **main** → **/(root)**
   - Click **Save**

3. **Access Your Site:**
   - Your site will be live at: `https://yourusername.github.io/StockSense-Hub`

## Important Notes:

- ✅ **Frontend works perfectly** on GitHub Pages
- ⚠️ **Backend API** still needs Google Apps Script deployment
- 📱 **Mobile responsive** out of the box
- 🔒 **HTTPS enabled** automatically

---

# �💻 Local Development

Run the project locally using any static server.

Example with Python:

```bash
python -m http.server 8000
```

Then open:

```
http://localhost:8000
```

You may also use:

* VS Code Live Server
* Node static server
* any local development tool

---

# 📁 Project Structure

```
StockSense-Hub
│
├── index.html
├── dashboard.html
│
├── css
│   └── styles.css
│
├── js
│   ├── app.js
│   ├── api.js
│   ├── storage.js
│   └── prediction.js
│
├── backend
│   ├── code.gs
│   └── alertengine.gs
│
└── README.md
```

---

# 📌 Project Purpose

StockSense Hub is intended as a **learning project focused on financial data analysis, web application architecture, and serverless backend integration.**

It demonstrates how a modern web dashboard can combine:

* real-time financial data
* technical analysis
* automation
* and serverless infrastructure

within a lightweight architecture.

---

# 👨‍💻 Author

**Aarush Tiwari**

BTech Computer Science (AI & ML)
Interested in FinTech, AI systems, and intelligent data platforms.

---
