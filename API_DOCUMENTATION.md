# NexMeet API Documentation

**Base URL:** `http://localhost:5000` (API Gateway)

**Standard Response Wrapper:** All REST endpoints return a standardized JSON wrapper:
```json
{
  "success": true,
  "message": "Optional message",
  "data": { ... },
  "errors": null
}
```
> On failure: `"success": false`, `"data": null`, `"errors": ["reason 1", ...]`

---

## 1. Identity & Users (`IdentityService`)

### 1.1. Authentication

---

#### `POST /api/auth/register`
**Auth:** Public

**Request body:**
```json
{
  "login": "john_doe",
  "password": "Password123!",
  "email": "john@test.com",
  "displayName": "John"
}
```

**Response `data`:**
```json
{
  "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "accessToken": "<JWT>",
  "displayName": "John",
  "avatarUrl": null,
  "themePreference": "Light",
  "createdAt": "2026-04-18T10:00:00Z"
}
```
> Also sets an `HttpOnly` cookie `refresh_token` (expires in 7 days).

---

#### `POST /api/auth/login`
**Auth:** Public

**Request body:**
```json
{
  "identifier": "john_doe",
  "password": "Password123!"
}
```
> `identifier` can be either the username (`login`) or the email address.

**Response `data`:** Same shape as `/register` response above.
> Also sets/refreshes the `HttpOnly` cookie `refresh_token`.

---

#### `POST /api/auth/refresh`
**Auth:** Cookie (`refresh_token`)

**Request body:** None. Must send with `credentials: 'include'` so the browser attaches the cookie.

**Response `data`:** Same shape as `/register` response above (new `accessToken` issued).
> Also rotates the `HttpOnly` cookie `refresh_token`.

---

#### `POST /api/auth/guest`
**Auth:** Public

**Request body:**
```json
{
  "guestName": "Anonymous User",
  "meetingCode": "abc-defg-hij"
}
```

**Response `data`:**
```json
{
  "accessToken": "<short-lived Guest JWT>"
}
```
> No refresh token issued for guests. The token contains a `meeting_code` claim that locks it to the specified room.

---

#### `PUT /api/auth/password`
**Auth:** `Bearer <token>` (any authenticated user)

**Request body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```

**Response:** `204 No Content` (no `data` field).
> Invalidates all existing refresh tokens, effectively logging out all other sessions.

---

### 1.2. User Profile

---

#### `GET /api/user/profile`
**Auth:** `Bearer <token>` (Member only)

**Request body:** None.

**Response `data`:**
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "login": "john_doe",
  "email": "john@test.com",
  "displayName": "John",
  "avatarUrl": null,
  "themePreference": "Light",
  "createdAt": "2026-04-18T10:00:00Z"
}
```

---

#### `PUT /api/user/profile`
**Auth:** `Bearer <token>` (Member only)

**Request body:**
```json
{
  "displayName": "Johnny",
  "email": "johnny@test.com",
  "avatarUrl": null,
  "themePreference": "Dark"
}
```
> `avatarUrl` is optional (can be `null`).

**Response:** `204 No Content` (no `data` field).

---

#### `PUT /api/user/password`
**Auth:** `Bearer <token>` (Member only)

**Request body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```

**Response:** `204 No Content` (no `data` field).

---

## 2. Meeting Rooms (`RoomsService`)

---

#### `POST /api/rooms`
**Auth:** `Bearer <token>` (Member only)

**Request body:**
```json
{
  "name": "Weekly Sync"
}
```

**Response:** `201 Created`

**Response `data`:**
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "code": "abc-defg-hij",
  "name": "Weekly Sync",
  "ownerId": "9b2e1234-aaaa-bbbb-cccc-ddddeeee0001",
  "isActive": true,
  "createdAt": "2026-04-18T10:00:00Z"
}
```

---

#### `GET /api/rooms/{code}`
**Auth:** Public

**Path param:** `code` — the room code (e.g. `abc-defg-hij`).

**Response `data`:** Same shape as `POST /api/rooms` response above.

---

#### `POST /api/rooms/{code}/join`
**Auth:** `Bearer <token>` (Member or Guest)

**Path param:** `code` — the room code.
**Request body:** None.

> Guest tokens must have a `meeting_code` claim matching the path `{code}`, otherwise the server returns `403 Forbidden`.

**Response `data`:**
```json
{
  "joined": true
}
```

---

#### `GET /api/rooms/my-history`
**Auth:** `Bearer <token>` (Member only)

**Request body:** None.

**Response `data`:** Array of room history entries:
```json
[
  {
    "code": "abc-defg-hij",
    "name": "Weekly Sync",
    "joinedAt": "2026-04-17T09:30:00Z",
    "wasOwner": true
  }
]
```

---

#### `DELETE /api/rooms/{id}`
**Auth:** `Bearer <token>` (Member only — must be room owner)

**Path param:** `id` — the room UUID.
**Request body:** None.

**Response `data`:** `null`, `"message": "Room closed successfully."`

---

## 3. Chat, History & Files (`MessagesService`)

### 3.1. Files (REST)

---

#### `POST /api/files/upload/{roomId}`
**Auth:** `Bearer <token>` (Member only)

**Path param:** `roomId` — the room UUID.
**Content-Type:** `multipart/form-data`
**Form field:** `file` — the file to upload.

**Response `data`:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "roomId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "uploaderUserId": "9b2e1234-aaaa-bbbb-cccc-ddddeeee0001",
  "uploaderDisplayName": "John",
  "originalFileName": "report.pdf",
  "contentType": "application/pdf",
  "size": 204800,
  "uploadedAt": "2026-04-18T10:05:00Z"
}
```
> `size` is in bytes.

---

#### `GET /api/files/download/{fileId}`
**Auth:** `Bearer <token>` (any authenticated user)

**Path param:** `fileId` — the file ID from the upload response.

**Response:** Raw file stream with appropriate `Content-Type` and `Content-Disposition` headers. **Not** a JSON wrapper.

---

#### `DELETE /api/files/delete/{fileId}`
**Auth:** `Bearer <token>` (Member only — must be the uploader)

**Path param:** `fileId` — the file ID.
**Request body:** None.

**Response `data`:** `null`, `"message": "File deleted successfully."`

---

### 3.2. History (REST)

---

#### `GET /api/history/{roomId}`
**Auth:** `Bearer <token>` (Member only)

**Path param:** `roomId` — the room UUID.
**Query params:**

| Param | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `limit` | `int` | `50` | Max number of messages to return. |
| `before` | `DateTime` (ISO 8601) | `null` | Cursor for pagination — returns messages older than this timestamp. |

> `files` is only populated on the **initial load** (when `before` is omitted). Subsequent paginated requests return an empty `files` array.

**Response `data`:**
```json
{
  "messages": [
    {
      "id": "507f1f77bcf86cd799439011",
      "roomId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "senderUserId": "9b2e1234-aaaa-bbbb-cccc-ddddeeee0001",
      "senderDisplayName": "John",
      "text": "Hello everyone!",
      "createdAt": "2026-04-18T10:00:00Z"
    }
  ],
  "files": [
    {
      "id": "507f1f77bcf86cd799439011",
      "roomId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "uploaderUserId": "9b2e1234-aaaa-bbbb-cccc-ddddeeee0001",
      "uploaderDisplayName": "John",
      "originalFileName": "report.pdf",
      "contentType": "application/pdf",
      "size": 204800,
      "uploadedAt": "2026-04-18T10:05:00Z"
    }
  ]
}
```

---

#### `DELETE /api/history/messages/{messageId}`
**Auth:** `Bearer <token>` (Member only — must be the sender)

**Path param:** `messageId` — the MongoDB ObjectId string.
**Request body:** None.

**Response `data`:** `null`, `"message": "Message deleted successfully."`

---

### 3.3. Chat WebSockets (SignalR)

**Endpoint:** `ws://localhost:5000/hubs/chat?access_token=<YOUR_JWT>`

**Methods to Call (Frontend → Server):**

| Method | Arguments | Description |
| :--- | :--- | :--- |
| `JoinRoom` | `roomId: string` | Call immediately after connecting. |
| `LeaveRoom` | `roomId: string` | Call when leaving the chat. |
| `SendMessage` | `roomId: string, text: string` | Send a text message. |
| `SendTypingStatus` | `roomId: string, isTyping: boolean` | Trigger the typing indicator. |

**Events to Listen For (Server → Frontend):**

| Event | Payload | Description |
| :--- | :--- | :--- |
| `UserJoined` | `connectionId: string` | A new user connected to the room. |
| `UserLeft` | `connectionId: string` | A user disconnected from the room. |
| `ReceiveMessage` | `ChatMessageResponse` (see shape below) | A new chat message was sent. |
| `UserTyping` | `displayName: string, isTyping: boolean` | Typing indicator update. |

**`ChatMessageResponse` shape (in `ReceiveMessage` event):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "roomId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "senderUserId": "9b2e1234-aaaa-bbbb-cccc-ddddeeee0001",
  "senderDisplayName": "John",
  "text": "Hello everyone!",
  "createdAt": "2026-04-18T10:00:00Z"
}
```

---

## 4. Video & Audio WebRTC (`SignalingService`)

### 4.1. WebRTC Config (REST)

---

#### `GET /api/signaling/ice-servers`
**Auth:** `Bearer <token>` (any authenticated user)

**Request body:** None.

**Response `data`:**
```json
{
  "iceServers": [
    {
      "urls": "stun:stun.l.google.com:19302",
      "username": null,
      "credential": null
    },
    {
      "urls": "turn:turn.example.com:3478",
      "username": "user",
      "credential": "secret"
    }
  ]
}
```
> Pass this directly into `new RTCPeerConnection({ iceServers: data.iceServers })`.

---

#### `POST /api/signaling/report-issue`
**Auth:** `Bearer <token>` (any authenticated user)

**Request body:**
```json
{
  "roomCode": "abc-defg-hij",
  "description": "ICE connection failed after 10 seconds"
}
```

**Response `data`:** `null`, `"message": "Issue reported successfully."`

---

### 4.2. Video WebSockets (SignalR)

**Endpoint:** `ws://localhost:5000/hubs/signaling?access_token=<YOUR_JWT>`

**Methods to Call (Frontend → Server):**

| Method | Arguments | Description |
| :--- | :--- | :--- |
| `JoinMeeting` | `roomCode: string` | Call immediately upon connection. |
| `LeaveMeeting` | `roomCode: string` | Call to safely disconnect peers. |
| `SendOffer` | `targetConnectionId: string, sdpOffer: object` | Send a WebRTC SDP Offer to a specific peer. |
| `SendAnswer` | `targetConnectionId: string, sdpAnswer: object` | Send a WebRTC SDP Answer back to the offerer. |
| `SendIceCandidate` | `targetConnectionId: string, candidate: object` | Send a trickled ICE candidate. |

**Events to Listen For (Server → Frontend):**

| Event | Payload | Description |
| :--- | :--- | :--- |
| `PeerJoined` | `connectionId: string` | A new peer entered. Create an `RTCPeerConnection`, generate an Offer, and send it to this `connectionId`. |
| `PeerLeft` | `connectionId: string` | Peer disconnected. Close the `RTCPeerConnection` and remove their `<video>` element. |
| `ReceiveOffer` | `sourceConnectionId: string, sdpOffer: object` | Set as remote description, generate an Answer, and call `SendAnswer`. |
| `ReceiveAnswer` | `sourceConnectionId: string, sdpAnswer: object` | Set as remote description to complete the handshake. |
| `ReceiveIceCandidate` | `sourceConnectionId: string, candidate: object` | Add to the peer connection via `addIceCandidate()`. |
