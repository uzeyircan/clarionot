# clarionot (Web + PWA)

# clarionot ✨

clarionot is a modern **personal knowledge management** app that helps you save **important links and notes instantly**, organize them with tags, and find them again in seconds.

> Never lose something you said “I’ll check later” to.

🌐 **Web App:** https://clarionot.com  
🧩 **Chrome Extension:** Clario Clip (PRO)

---

## 🚀 What Is clarionot?

clarionot eliminates the chaos of scattered links, forgotten notes, and messy bookmarks.

It is designed for people who:
- Save a lot of links
- Take quick notes while browsing
- Want fast access to what they saved
- Don’t want their workflow interrupted

---

## 🧠 Core Features

### 📌 Link Saving
- Manually add links
- Automatic title fetching from URLs
- Optional descriptions for context

### 📝 Notes
- Short or long-form notes
- Automatic title generation
- Tag support

### 🔍 Smart Search
- Search by title
- Search by content
- Search by tags

### 🧩 Chrome Extension (PRO)
- Right-click → **“Save to clarionot”**
- Save links, pages, or selected text
- Secure token-based connection
- Zero friction, instant saving

---

## 💎 Plans

### 🆓 Free
- Limited number of items (e.g. 50)
- Manual saving via web app
- Search & tagging

### 🚀 Pro
- Unlimited items
- Chrome Extension access
- One-click clipping
- Early access to upcoming features

> The Chrome Extension is **available only for Pro users**.

---

## 🔐 Security

- Authentication handled by Supabase Auth
- Extension connects using **one-time generated tokens**
- Tokens are stored **hashed**, never in plain text
- You can revoke extension access at any time

---

## 🏗️ Tech Stack

### Frontend
- Next.js (App Router)
- React
- Tailwind CSS

### Backend
- Supabase (PostgreSQL + Auth)
- API Routes / Server-side logic

### Browser Extension
- Chrome Extension (Manifest V3)
- Background Service Worker
- Secure API communication via Bearer tokens

---

## 📦 Project Structure (Overview)