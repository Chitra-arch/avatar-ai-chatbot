# 🤖 Avatar AI Chatbot

A professional animated AI chatbot with expressive 3D avatars, voice interaction, and Google Gemini AI — built with React, Three.js, and Node.js/Express.

---

## 📁 Project Structure

```
avatar-ai-chatbot/
├── client/                        # React frontend (Vite)
│   ├── public/
│   │   └── avatars/               # Place .glb avatar files here (optional)
│   │       ├── woman.glb
│   │       ├── man.glb
│   │       └── muslimgirl.glb
│   ├── src/
│   │   ├── components/
│   │   │   ├── AvatarScene.jsx    # 3D animated avatar (Three.js / R3F)
│   │   │   ├── AvatarSelector.jsx # Avatar picker UI
│   │   │   ├── ChatBox.jsx        # Full chat interface
│   │   │   ├── Navbar.jsx         # Navigation bar
│   │   │   ├── ParticleBackground.jsx  # Animated star/particle bg
│   │   │   ├── ThemeSwitcher.jsx  # Cyber / Dark / Light themes
│   │   │   └── TypingIndicator.jsx     # "AI is thinking..." dots
│   │   ├── context/
│   │   │   ├── AvatarContext.jsx  # Global avatar selection state
│   │   │   ├── ChatContext.jsx    # Global chat messages & stats
│   │   │   └── ThemeContext.jsx   # Global theme state
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx    # Home with hero section & features
│   │   │   ├── ChatPage.jsx       # Main chat interface
│   │   │   ├── AvatarPage.jsx     # Avatar selection page
│   │   │   └── Dashboard.jsx      # Analytics & usage stats
│   │   ├── styles/
│   │   │   └── theme.css          # CSS variables for all 3 themes
│   │   ├── App.jsx                # Router + providers
│   │   ├── main.jsx               # Entry point
│   │   └── index.css              # Tailwind base
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── server/                        # Node.js/Express backend
│   ├── routes/
│   │   └── chat.js                # POST /api/chat endpoint
│   ├── services/
│   │   └── geminiService.js       # Gemini 1.5 Flash integration
│   ├── app.js                     # Express server entry
│   ├── .env.example               # Environment variable template
│   └── package.json
│
└── README.md
```

---

## ✨ Features

| Feature | Description |
|---|---|
| 🧍 **3D Animated Avatars** | Built with React Three Fiber — blinking, idle motion, mouse-eye-tracking, wave on hover |
| 🎭 **3 Personalities** | Aria (friendly), Axel (neutral), Layla (calm) — each with unique Gemini prompts |
| 🧠 **Gemini AI** | Google Gemini 1.5 Flash with full conversation history |
| 🎤 **Voice Input** | Web Speech API — speak your message, AI responds via speech synthesis |
| 🔊 **TTS Output** | Browser speech synthesis with lip-sync animation while speaking |
| 🎨 **3 Themes** | Cyber (purple), Dark (green), Light — with CSS variables, persisted in localStorage |
| 📊 **Dashboard** | Real-time analytics: total messages, voice vs text, avatar usage with bar charts |
| ✨ **Particle Background** | Animated star/particle canvas with connecting lines |

---

## 🚀 Installation & Setup

### Prerequisites
- **Node.js** v18 or higher
- **npm** v8 or higher
- A free **Gemini API key** from [Google AI Studio](https://aistudio.google.com/app/apikey)

---

### Step 1 — Clone / Download the project

```bash
# If using git:
git clone <your-repo-url>
cd avatar-ai-chatbot

# Or just unzip the downloaded folder and cd into it
cd avatar-ai-chatbot
```

---

### Step 2 — Set up the Backend

```bash
# Navigate to the server folder
cd server

# Install dependencies
npm install

# Create your .env file from the example
cp .env.example .env
```

Now open `server/.env` in any text editor and add your API key:

```env
GEMINI_API_KEY=AIzaSy...your_actual_key_here
PORT=5000
```

---

### Step 3 — Set up the Frontend

```bash
# Open a NEW terminal and navigate to client folder
cd client

# Install dependencies
npm install
```

---

### Step 4 — Run the project

You need **two terminals** running simultaneously:

**Terminal 1 — Start the backend:**
```bash
cd server
npm run dev
```

You should see:
```
  ╔════════════════════════════════════════╗
  ║      Avatar AI Chatbot — Server        ║
  ╠════════════════════════════════════════╣
  ║  Running at: http://localhost:5000     ║
  ║  Gemini Key: ✅ Set                    ║
  ╚════════════════════════════════════════╝
```

**Terminal 2 — Start the frontend:**
```bash
cd client
npm run dev
```

Then open your browser at: **http://localhost:5173**

---

## 🎮 Usage Guide

### Navigation
- **Home** — Landing page with animated hero and feature overview
- **Avatars** — Select and preview your AI companion
- **Chat** — Main chat interface with 3D avatar
- **Dashboard** — Analytics and usage statistics

### Chat Features
- Type a message and press **Enter** or click the **Send (➤)** button
- Click the **🎤 microphone** button to speak your message (Chrome recommended)
- The avatar **lip-syncs** while the AI speaks the response
- **Hover** over the 3D avatar to trigger a wave animation
- Move your **mouse** to make the avatar look around

### Theme Switching
Click the theme button in the navbar to switch between:
- ⚡ **Cyber** — Purple/violet neon (default)
- 🌑 **Dark** — Green terminal theme
- ☀️ **Light** — Clean light mode

---

## 🔑 Getting a Gemini API Key

1. Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the key and paste it into `server/.env`

The free tier is generous enough for development and demos.

---

## 🛠 Troubleshooting

| Problem | Solution |
|---|---|
| `GEMINI_API_KEY not set` error | Make sure you created `server/.env` and added your key |
| Chat shows "connection error" | Make sure the server is running on port 5000 |
| Microphone not working | Use Chrome/Edge; allow microphone permissions in browser |
| Avatar not visible | The 3D avatar uses procedural geometry, no external files needed |
| Port already in use | Change `PORT=5001` in `.env` and update `vite.config.js` proxy target |

---

## 🧑‍💻 Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + Vite |
| 3D rendering | Three.js + React Three Fiber + Drei |
| Animations | Framer Motion |
| Styling | Tailwind CSS + CSS Variables |
| Routing | React Router v6 |
| Backend | Node.js + Express |
| AI | Google Gemini 1.5 Flash |
| Voice | Web Speech API (browser-native) |

---

## 📝 Notes for Students

- The **3D avatar** is built from basic Three.js geometry (spheres, cylinders, capsules) — no external `.glb` files required, though the folder `client/public/avatars/` is ready for them.
- All **state is managed with React Context** — no Redux needed.
- The **theme system** uses pure CSS custom properties (`--variable-name`) applied to `[data-theme]` selectors, making it easy to add new themes.
- The **Gemini integration** is in `server/services/geminiService.js` — a single function, easy to swap for another AI provider.
- **Speech recognition** uses the browser-native `webkitSpeechRecognition` API — no external library needed.

---

Built for university project demo · React + Three.js + Gemini AI
