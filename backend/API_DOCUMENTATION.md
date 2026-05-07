# KirtanSarthi Backend API Documentation

Version: 2.0  
Last Updated: March 7, 2026  
Base URL: `http://localhost:4000`  
API Prefix: `/api/v1`

## 1. Quick Overview

- Health check: `GET /`
- Auth type: JWT Bearer token
- Primary roles: `USER`, `ARTIST`, `ADMIN`
- Real-time transport: Socket.IO

Server route mount points:

- `/api/v1/auth`
- `/api/v1/profile`
- `/api/v1/notify`
- `/api/v1/reach`
- `/api/v1/admin`
- `/api/v1/ai`
- `/api/v1/artist`
- `/api/v1/availability`
- `/api/v1/booking`
- `/api/v1/rating`
- `/api/v1/chat`
- `/api/v1/message`
- `/api/v1/event`

## 2. Authentication

Use header:

`Authorization: Bearer <jwt_token>`

JWT payload currently contains:

- `id`
- `email`
- `accountType`

Role guards used in routes:

- `auth`
- `isUser`
- `isArtist`
- `isAdmin`

## 3. Common Response Patterns

Success examples:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

```json
{
  "success": true,
  "token": "...",
  "user": {}
}
```

Error examples:

```json
{
  "success": false,
  "message": "Validation failed"
}
```

Some endpoints return custom keys like `reply`, `notifications`, `artists`, `booking`, `event`, `slots`, etc.

## 4. Enums and Key Domain Values

- Account Type: `USER | ARTIST | ADMIN`
- Booking Status: `PENDING | COUNTERED | ACCEPTED | REJECTED | CANCELLED | COMPLETED`
- Event Visibility: `PUBLIC | PRIVATE`
- Chat Type: `PRIVATE | GROUP`
- Message Type: `text | image | audio`
- AI Intent: `SEARCH | BOOK | CANCEL | GREETING | HELP | UNKNOWN`

## 5. API Endpoints

### 5.1 Auth APIs (`/api/v1/auth`)

#### POST `/sendotp`
- Access: Public
- Body:

```json
{
  "email": "user@example.com"
}
```

- Response: sends OTP and creates OTP record.

#### POST `/signup`
- Access: Public
- Body:

```json
{
  "firstName": "A",
  "lastName": "B",
  "email": "user@example.com",
  "password": "secret123",
  "confirmPassword": "secret123",
  "accountType": "USER",
  "phone": "9999999999",
  "city": "Jaipur",
  "otp": "123456"
}
```

- Required: `firstName, lastName, email, password, accountType, otp`
- Notes: `city` is normalized to lowercase.

#### POST `/login`
- Access: Public
- Body:

```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

- Response: `token`, `user`.

#### POST `/changepassword`
- Access: Protected (`auth`)
- Body:

```json
{
  "oldPassword": "old123",
  "newPassword": "new123"
}
```

#### POST `/reset-password-token`
- Access: Public
- Body:

```json
{
  "email": "user@example.com"
}
```

- Response: sends reset link email.

#### POST `/reset-password`
- Access: Public
- Body:

```json
{
  "password": "new123",
  "confirmPassword": "new123",
  "token": "reset_token"
}
```

#### POST `/location`
- Access: Public (current route)
- Body:

```json
{
  "lat": 26.9,
  "lng": 75.8
}
```

- Important: current controller expects `req.user.id` but route is not protected. This should be changed to `auth` in code.

---

### 5.2 Profile APIs (`/api/v1/profile`)

All endpoints require `auth`.

#### DELETE `/deleteProfile`
- Deletes logged-in user account.

#### PUT `/updateProfile`
- Body (at least one):

```json
{
  "phone": "9999999999",
  "city": "jaipur",
  "gender": "male"
}
```

#### GET `/getUserDetails`
- Returns current user data.

#### PUT `/updateDisplayPicture`
- Content-Type: `multipart/form-data`
- File field: `displayPicture`

---

### 5.3 Artist APIs (`/api/v1/artist`)

#### POST `/create`
- Access: `auth` (only artist account can create)
- Body:

```json
{
  "artistType": "SOLO",
  "groupName": "",
  "membersCount": 1,
  "description": "...",
  "experienceYears": 5,
  "eventTypes": ["Kirtan"],
  "gods": ["Krishna"],
  "price": 15000,
  "videoLinks": ["https://..."]
}
```

#### PUT `/update`
- Access: `auth + isArtist`
- Body: partial artist fields.

#### GET `/me`
- Access: `auth + isArtist`
- Returns own artist profile.

#### GET `/artistProfile/:artistId`
- Access: Public
- Returns approved artist profile with basic user info.

#### GET `/search`
- Access: Public
- Query params (optional):
  - `city`
  - `god`
  - `eventType`
  - `minRating`
  - `maxPrice`
  - `name`
- Returns only artists where:
  - `isApproved = true`
  - `isSuspended = false`

---

### 5.4 Admin APIs (`/api/v1/admin`)

All endpoints require `auth + isAdmin`.

#### GET `/getartist`
- Returns unapproved artists.

#### PUT `/reviewartist`
- Body:

```json
{
  "artistId": "artist_object_id",
  "action": "APPROVE",
  "reason": "optional for reject"
}
```

- `action`: `APPROVE | REJECT`
- `REJECT` now performs soft suspension (no hard delete).

#### POST `/suspend-artist`
- Access: `auth + isAdmin`
- Body:

```json
{
  "artistId": "artist_object_id",
  "reason": "Fraud activity"
}
```

- Effect:
  - sets `isSuspended = true`
  - sets `suspensionReason`
  - sets `suspendedAt`
  - auto-cancels artist bookings in `PENDING` or `COUNTERED`
  - keeps accepted/completed bookings intact

#### POST `/reactivate-artist`
- Access: `auth + isAdmin`
- Body:

```json
{
  "artistId": "artist_object_id"
}
```

- Effect:
  - sets `isSuspended = false`
  - clears `suspensionReason`
  - clears `suspendedAt`

---

### 5.5 Availability APIs (`/api/v1/availability`)

#### POST `/create`
- Access: `auth + isArtist`
- Body:

```json
{
  "date": "2026-03-20",
  "slots": [
    { "startTime": "10:00", "endTime": "12:00" },
    { "startTime": "14:00", "endTime": "16:00" }
  ]
}
```

- Suspended artists are blocked with:
  - `403` + `"Artist account suspended by admin"`

#### GET `/free/:artistId`
- Access: `auth`
- Query: `date=YYYY-MM-DD`
- Response:

```json
{
  "slots": []
}
```

#### GET `/:artistId`
- Access: Public
- Returns all availability docs for artist.

#### PUT `/update/:availabilityId`
- Access: `auth + isArtist`
- Body:

```json
{
  "slots": [
    { "startTime": "10:00", "endTime": "12:00", "isBooked": false }
  ]
}
```

#### POST `/markSlotBooked`
- Access: `auth + isArtist`
- Body:

```json
{
  "availabilityId": "availability_object_id",
  "slotIndex": 0
}
```

---

### 5.6 Booking APIs (`/api/v1/booking`)

#### POST `/create`
- Access: `auth + isUser`
- Body:

```json
{
  "artistId": "artist_id",
  "availabilityId": "availability_id",
  "slotIndex": 0,
  "userBudget": 12000,
  "eventVisibility": "PUBLIC",
  "eventDetails": {
    "title": "Shyam Kirtan",
    "eventType": "Kirtan",
    "god": "Krishna",
    "city": "jaipur",
    "address": "Some address",
    "date": "2026-04-01T15:00:00.000Z",
    "location": {
      "type": "Point",
      "coordinates": [75.8, 26.9]
    }
  }
}
```

- `eventVisibility`: `PUBLIC | PRIVATE` (optional; defaults PRIVATE if omitted)
- `eventDetails` required when `eventVisibility` provided.

#### POST `/respond`
- Access: `auth + isArtist`
- Body:

```json
{
  "bookingId": "booking_id",
  "action": "ACCEPT",
  "counterPrice": 15000
}
```

- `action`: `ACCEPT | COUNTER | REJECT`
- `counterPrice` required when `action=COUNTER`.
- Suspended artists are blocked with:
  - `403` + `"Artist account suspended by admin"`

#### POST `/cancel/user`
- Access: `auth + isUser`
- Body:

```json
{
  "bookingId": "booking_id"
}
```

#### POST `/cancel/artist`
- Access: `auth + isArtist`
- Body:

```json
{
  "bookingId": "booking_id"
}
```

#### POST `/counter`
- Access: `auth + isUser`
- Body:

```json
{
  "bookingId": "booking_id",
  "action": "ACCEPT",
  "counterPrice": 13000
}
```

- `action`: `ACCEPT | COUNTER | REJECT`
- Max counter exchanges: `3`

#### POST `/complete`
- Access: `auth`
- Body:

```json
{
  "bookingId": "booking_id"
}
```

- Allowed for booking owner (`USER`) or related `ARTIST`.

---

### 5.7 Rating APIs (`/api/v1/rating`)

#### POST `/create`
- Access: `auth + isUser`
- Body:

```json
{
  "artistId": "artist_id",
  "rating": 5,
  "review": "Great performance"
}
```

- Conditions:
  - user must have a `COMPLETED` booking with artist
  - one rating per user per artist

#### GET `/average/:artistId`
- Access: Public
- Returns computed average.

#### GET `/all`
- Access: Public
- Returns all reviews populated with user/artist data.

---

### 5.8 Event APIs (`/api/v1/event`)

#### POST `/create`
- Access: `auth`
- Allowed roles: `ADMIN`, `ARTIST` (approved)
- Body:

```json
{
  "title": "Bhajan Sandhya",
  "eventType": "Bhajan",
  "god": "Ram",
  "city": "Jaipur",
  "address": "Temple Road",
  "date": "2026-03-20T14:00:00.000Z",
  "visibility": "PUBLIC",
  "location": {
    "type": "Point",
    "coordinates": [75.8, 26.9]
  }
}
```

- If creator is an artist and artist is suspended:
  - `403` + `"Artist account suspended by admin"`

#### GET `/`
- Access: Public
- Query: `city` (optional)
- Behavior: returns only `PUBLIC` and `date >= now` upcoming events.

#### GET `/:id`
- Access: Public
- Returns event detail if not private.

#### GET `/artist/:artistId`
- Access: Public
- Returns events for given artist.

#### DELETE `/delete/:id`
- Access: `auth`
- Allowed account types in controller: `ADMIN` or `ARTIST`

---

### 5.9 Chat APIs (`/api/v1/chat`)

All endpoints use `auth`. Some also require `chat` middleware (`chatId` required and booking status check).

#### POST `/private`
- Body:

```json
{
  "artistUserId": "user_id_of_artist"
}
```

- Creates/reuses private chat only if user has booking with status `PENDING`, `COUNTERED`, or `ACCEPTED`.
- Chat status rules:
  - `PENDING`, `COUNTERED`, `ACCEPTED`: full chat allowed
  - `COMPLETED`: read-only chat (message list/read receipt allowed, new message/media/member changes blocked)
  - `REJECTED`, `CANCELLED`: chat blocked

#### POST `/group`
- Body:

```json
{
  "eventId": "event_id",
  "members": ["user_id_1", "user_id_2"]
}
```

#### GET `/my`
- Returns chats where current user is a member.

#### GET `/:chatId/mode`
- Access: `auth`
- Purpose: returns chat usability state for UI controls.
- Response:

```json
{
  "success": true,
  "chatMode": "active",
  "bookingStatus": "ACCEPTED"
}
```

- `chatMode` values:
  - `active` -> allow send/upload/member changes
  - `readonly` -> show messages, disable input/actions
  - `blocked` -> hide/disable chat actions

#### GET `/:chatId/messages`
- Access: `auth + chat middleware`

#### POST `/add`
- Access: `auth + chat middleware`
- Body:

```json
{
  "chatId": "chat_id",
  "newMemberId": "user_id"
}
```

#### POST `/remove`
- Access: `auth + chat middleware`
- Body:

```json
{
  "chatId": "chat_id",
  "memberId": "user_id"
}
```

#### POST `/upload`
- Access: `auth + chat middleware`
- Content-Type: `multipart/form-data`
- Body fields:
  - `chatId`
  - `file` (image/audio)

---

### 5.10 Message APIs (`/api/v1/message`)

#### POST `/read`
- Access: `auth + chat middleware`
- Body:

```json
{
  "chatId": "chat_id"
}
```

#### POST `/delete`
- Access: `auth + chat middleware`
- Body:

```json
{
  "chatId": "chat_id",
  "messageId": "message_id"
}
```

#### GET `/status/:userId`
- Access: `auth`
- Returns:

```json
{
  "isOnline": true,
  "lastSeen": null
}
```

---

### 5.11 Notification APIs (`/api/v1/notify`)

All endpoints require `auth`.

#### GET `/notification`
- Returns current user's notifications sorted by latest.

#### POST `/read`
- Body:

```json
{
  "notificationId": "notification_id"
}
```

---

### 5.12 Contact API (`/api/v1/reach`)

#### POST `/contact`
- Access: Public
- Body:

```json
{
  "email": "user@example.com",
  "firstname": "A",
  "lastname": "B",
  "message": "Need help",
  "phoneNo": "9999999999",
  "countrycode": "+91"
}
```

- Sends confirmation email.

---

### 5.13 AI API (`/api/v1/ai`)

#### POST `/chat`
- Access: `auth + isUser + aiRateLimit` (USER accounts only)
- Rate limit: 15 requests/minute per user/ip (in-memory process limiter)
- Body:

```json
{
  "message": "Find Krishna kirtan artist in Jaipur under 15000"
}
```

Intent behavior:

- `GREETING`: greeting reply
- `HELP`: usage reply
- `SEARCH`: returns filtered artists (`max 20`)
- `BOOK`: booking-start guidance text
- `CANCEL`: cancels only bookings owned by logged-in user with status in `PENDING|COUNTERED|ACCEPTED`

Possible responses:

```json
{
  "success": true,
  "reply": "I found 3 artists for you",
  "artists": []
}
```

```json
{
  "success": true,
  "reply": "Your booking has been cancelled",
  "booking": {
    "_id": "...",
    "status": "CANCELLED"
  }
}
```

```json
{
  "success": false,
  "reply": "Message too long. Max 1200 characters."
}
```

## 6. Socket.IO Real-Time Events

Socket server is attached to same backend host/port.

Client auth handshake currently expects:

```js
socket = io(baseURL, {
  auth: { token: jwtToken }
});
```

Supported client emits:

- `join` with `userId` (joins personal room)
- `joinChat` with `chatId`
- `sendMessage` with `{ chatId, content, type }`
- `userOnline` with `userId`
- `typing` with `{ chatId, userId }`
- `stopTyping` with `{ chatId, userId }`

Server emits:

- `newMessage`
- `messageError`
- `userStatus`
- `typing`
- `stopTyping`
- `readReceipt`
- `messageDeleted`
- `groupUpdated`
- `bookingUpdate`
- `nearbyEvent`

## 7. File Upload Endpoints

- `PUT /api/v1/profile/updateDisplayPicture` -> field: `displayPicture`
- `POST /api/v1/chat/upload` -> field: `file` + `chatId`

`express-fileupload` is enabled globally.

## 8. Known Implementation Caveats (Current Code)

These are current code-level caveats frontend should be aware of until fixed:

- `POST /api/v1/auth/location` route is public but controller expects authenticated user context.
- `POST /api/v1/chat/remove` currently contains a server-side variable bug (`senderId` is undefined), may return `500`.
- Event response population requests fields (`stageName`, `category`, `profileImage`) that do not exist in current `Artist` model; those fields will be absent.
- Rate limiter for AI endpoint is per-process memory, not distributed across multiple server instances.

## 9. Suggested Frontend Integration Defaults

- Add global bearer token interceptor.
- Treat `success: false` as failure even on HTTP `200` (some controllers use `200` with failure payload).
- Retry only idempotent GETs.
- Handle `429` from AI endpoint with `Retry-After`.
- For date filtering on events, send full ISO datetime from frontend.

## 10. Health Check

#### GET `/`

Response:

```json
{
  "success": true,
  "message": "Server is running"
}
```
