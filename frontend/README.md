# NexMeet Frontend

React + TypeScript frontend for NexMeet.

## Features
- Member login/register + guest token flow
- Lobby with create/join/history (member-only history)
- Room page with SignalR chat
- Role-aware behavior (Guest vs Member)
- Member-only chat history and file upload/delete
- Authenticated file list/download
- WebRTC signaling + peer media rendering

## Run locally
```bash
cd frontend
npm install
npm run dev
```

Default API base URL: `http://localhost:5000` (override with `VITE_API_BASE_URL`).
