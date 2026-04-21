# NexMeet: Real-Time Communication Platform

---

## 🌐 Overview
NexMeet is a modern, web-based communication tool designed to demonstrate **Network Convergence** by integrating voice, video, and data services into a single unified network architecture. 

To optimize performance and reliability, the application implements a **Hybrid Protocol Approach**:
*   **TCP (Transmission Control Protocol):** Utilized for signaling, real-time text chat, and file transfers to ensure reliable, ordered delivery of data through sequence numbering and acknowledgments.
*   **UDP (User Datagram Protocol):** Utilized for time-critical media streams (video and audio) to minimize latency by providing best-effort transport without the overhead of retransmission.

## 🎓 Networking Topics Covered
Following the principles of the OSI and TCP/IP Reference Models, this project implements:
> **Topics:** WebRTC, UDP (Media Streams), TCP (Signaling & Chat), WebSockets (SignalR), NAT Traversal (STUN/TURN), ICE Framework, Client-Server Architecture, Peer-to-Peer (P2P) Topology, Data Persistence, Asynchronous Socket Programming, JWT Authentication, Encapsulation, State Management, Flow Control.

---

## 🚀 Product Vision
NexMeet provides a secure environment for professional and personal video conferencing. Key characteristics include:
*   **Web-based Accessibility:** Cross-platform access via standard browsers.
*   **Identity & Guest Management:** Secure member profiles and anonymous guest access via transient session tokens.
*   **Convergence of Services:** Synchronous P2P video/audio streaming multiplexed with asynchronous chat and file sharing.
*   **Persistent Communication:** Registered members retain access to full meeting histories and shared assets.

### Functional Requirements
*   **Low-Latency Media:** Smooth rendering of video/audio using UDP.
*   **Reliable Data Exchange:** Error-free file and text transport using TCP.
*   **Network Diagnostics:** Real-time feedback on connection quality (RTT, Latency, and Packet Loss).
*   **Security:** Integrated JWT authentication and secure socket names to prevent unauthorized access.

---

## 🛠 Development Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React (TypeScript), Vite, HTML5, CSS3, JavaScript (ES6+) |
| **Backend** | ASP.NET Core (C#) |
| **Real-Time Data** | WebRTC (Media), SignalR / WebSockets (Chat/Events) |
| **Database** | PostgreSQL or MongoDB |
| **Network Utils** | STUN/TURN Servers for NAT Traversal |

---

## 📝 User Scripts

### [ Scenario 1 - User Registration ]
*   User enters login, password, email, and display name.
*   The system validates uniqueness of the login.
*   Security check ensures password is 8–30 characters and meets complexity requirements.
*   Valid data triggers account creation and redirects to the personal dashboard.

### [ Scenario 2 - Profile Customization ]
*   Users access "Edit Profile" to modify avatars, bios, and metadata.
*   Mandatory fields (name, email, login) are validated against database constraints.
*   Changes are updated in real-time across the network via session updates.

### [ Scenario 3 - Creating a Private Conference ]
*   User selects "Create Chat" and provides a meeting title.
*   The system generates a unique, cryptographically secure room ID.
*   A private invite link is issued; the room is hidden from public directories.

### [ Scenario 4 - Joining a Meeting ]
*   Members join via link and are identified by their profile data.
*   Anonymous guests enter a name and receive a transient session token to enter the lobby.
*   Signaling server establishes P2P or relayed connections between participants.

### [ Scenario 5 - Real-time Messaging & Presence ]
*   Messages are encapsulated into TCP segments and sent via WebSockets.
*   Server broadcasts messages to all connected participants in the room.
*   "User is typing" indicators provide real-time presence feedback.

### [ Scenario 6 - Reliable File Transfer ]
*   Files are split into binary chunks for segmented transmission over TCP.
*   A progress bar reflects the sliding window status and acknowledgment of chunks.
*   Shared files are archived and available for download via unique specific addresses.

### [ Scenario 7 - Meeting History & Archive ]
*   Authenticated users access the "Meeting History" dashboard.
*   Previous sessions are listed with full chat transcripts and shared file links.
*   Guest users are excluded from persistent history once their session socket closes.

### [ Scenario 8 - Theme Switching ]
*   A UI toggle switches between Light and Dark modes.
*   User preferences are stored in the database or local storage to persist after page reload.

---

## ⚠️ Possible Risks & Mitigation
*   **NAT Traversal:** Strict firewalls may block P2P UDP traffic. *Mitigation:* Implementation of TURN relay servers.
*   **Knowledge Gaps:** Complexity in managing asynchronous socket programming and media bitrates. *Mitigation:* Extensive testing with Python/C# network libraries.
*   **Time Constraints:** Feature-rich messenger development is complex. *Mitigation:* Prioritize core signaling and transport logic (TCP/UDP) over UI aesthetics.

## Frontend
A React frontend is available in `frontend/` and is exposed on `http://localhost:5173` when running `docker compose up --build`.
