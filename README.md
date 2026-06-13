# 🎬 ShowTime

---

## 📖 About

**ShowTime** is a full-stack movie ticket booking application built using the **MERN Stack (MongoDB, Express.js, React.js, and Node.js)**. Users can browse movies, view show schedules, select seats, and book tickets through a modern and responsive interface.

The application leverages **Clerk Authentication** for secure user management and **Clerk Webhooks** to synchronize user data with MongoDB. **Inngest** powers background workflows such as automated reminder emails and event-driven API processing.

An integrated **Admin Dashboard** allows administrators to manage movies, create shows, and configure ticket pricing.

---

## 🚀 Features

### User Features

* 🔐 Secure Authentication with Clerk
* 🎥 Browse Available Movies
* 🕒 View Show Timings
* 💺 Interactive Seat Selection
* 🎟️ Online Ticket Booking
* 📧 Automated Booking Reminder Emails
* 📱 Fully Responsive Design

### Admin Features

* 🎬 Add and Manage Movies
* 📅 Create and Manage Shows
* 💰 Configure Ticket Prices
* 📊 Manage Platform Content

---

## 🛠️ Tech Stack

### Frontend

* React.js
* Tailwind CSS
* Typescript

### Backend

* Node.js
* Express.js

### Database

* MongoDB

### Authentication

* Clerk Authentication
* Clerk Webhooks

### Workflow Automation

* Inngest

### Deployment

* Vercel

---

## 🌐 Live Demo

**Application:** https://show-time-mocha.vercel.app/

---

## 📦 Installation

Clone the repository:

```bash
git clone https://github.com/AnisJShk/ShowTime.git
cd ShowTime
```

Install dependencies:

```bash
npm install
```

---

## ⚙️ Environment Variables

Create a `.env` file and configure the required variables:

```env
MONGODB_URI=
CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=
CLERK_WEBHOOK_SECRET=
INNGEST_EVENT_KEY=
```

---

## ▶️ Running Locally

```bash
npm run dev
```

---

## 👨‍💻 Author

**Anis Shaikh**

GitHub: https://github.com/AnisJShk

---

## ⭐ Support

If you found this project helpful, consider giving it a **star** on GitHub.
