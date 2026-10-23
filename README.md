# ProLearningHub

**Harvard-Inspired Learning, Accessible for All.**

ProLearningHub lets you create a standalone app for your course—or a portal for
multiple courses—delivering a Harvard-inspired experience with everything
students need in one place. No more scattered tools, missing resources, or
disconnected discussions—just seamless learning.

[Request a Demo](https://prolearninghub.vercel.app/request-demo) | [Explore the Platform](https://testcourse-prolearninghub.netlify.app/)

---

## ✨ Features

Everything you need for a complete learning experience.

### 📚 A Complete Lecture Experience
- **All-in-One Formats**: Video, audio, and transcripts in one place.
- **Supporting Materials**: Notes, slides, problem sets, quizzes, and demos.
- **Built-in Discussions**: Each lecture has its own dedicated forum for structured Q&A.

### 💬 Discussion & Collaboration Made Simple
- **Built-in Forums**: Every lecture and the course as a whole have dedicated discussion spaces.
- **Real-time Updates**: Stay in sync with the latest conversations.
- **Rich Text & Attachments**: Full-text formatting and media support.
- **Threaded Replies**: Keep conversations clear and easy to follow.
- **Upvoted Answers**: The best answers rise to the top.

### 📢 Stay Informed with Announcements
- **Centralized Updates**: Professors and admins can send structured announcements.
- **Interactive Discussions**: Announcements support threaded comments for clarity.

### 🛠️ Featured Study & Productivity Tools
- **Group Study Sessions**: Integrations with Flocus & Study Together.
- **Focus Tools**: Pomodoro timers and "Study With Me" videos.
- **Learn How to Learn**: Courses on study habits and effective learning.
- **Organization Tools**: Quick access to Notion, TicTic, RemindMe, and more.

---

## 🚀 Why Choose ProLearningHub?

- **Focus on Content**: You create the content; we handle the rest.
- **By Students, For Students**: Built to fill the real gaps in online learning.
- **All-in-One Platform**: Combines structured lectures, discussions, and study tools.
- **Offline-First**: Smart caching and syncing for low-connectivity areas.
- **Study Smarter**: Integrated tools for focus, habit-building, and collaboration.

---

## 💻 Tech Stack

- **Frontend**: React 19, Vite, Tailwind v4, shadcn/ui, RTK Query, Socket.IO Client
- **Backend**: NestJS 10, Drizzle ORM, Socket.IO, cookie JWT
- **Database**: Postgres
- **Deployment**: Vercel (Frontend), Docker

---

## Getting Started

Follow these steps to clone and run the project locally.

### Prerequisites

- Node.js and npm
- Postgres 16+
- Docker and Docker Compose (optional)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Pro-Learning-Hub/Pro-Learning-Hub.git
    cd Pro-Learning-Hub
    ```

2.  **Set up environment variables**:
    - Copy `frontend/.env.example` to `frontend/.env`
    - Copy `backend/.env.example` to `backend/.env`

3.  **Apply the Postgres schema** from `backend/drizzle/0000_init.sql` (and `0001_votes_unique.sql` if the database already exists).

4.  **Run the apps**:
    ```bash
    cd backend && npm install && npm run start:dev
    ```

    ```bash
    cd frontend && npm install && npm run dev
    ```

The frontend is at `http://localhost:5173` and the backend at `http://localhost:3000` (`/api/v1`). Vite proxies `/api` and `/socket.io` to the backend.

---

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository.
2. Create a new branch: `git checkout -b feature-branch-name`.
3. Make your changes and commit them: `git commit -m 'Feature description'`.
4. Push to the branch: `git push origin feature-branch-name`.
5. Submit a pull request.
