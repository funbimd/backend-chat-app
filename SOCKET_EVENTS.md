# 📡 Socket.IO Events Documentation

## Authentication

- **How to connect:**
  The client must provide a valid JWT in the `auth` payload when connecting:
  ```js
  const socket = io(API_URL, {
    auth: { token: "JWT_TOKEN_HERE" },
  });
  ```
  If the token is missing, invalid, or blacklisted, the connection will be rejected.

---

## Events (Client → Server)

### 1. `send_message`

- **Description:** Send a message to a friend.
- **Payload:**
  ```json
  {
    "receiverId": "string", // Friend's user ID
    "content": "string", // Message text (max 1000 chars)
    "messageType": "text" // Optional: "text" (default) or "image"
  }
  ```
- **Server emits:**
  - `message_sent` (to sender, with message info)
  - `new_message` (to receiver, with message info)
  - `error` (if not friends, blocked, or DB error)

---

### 2. `get_chat_history`

- **Description:** Fetch chat history with a friend.
- **Payload:**
  ```json
  {
    "friendId": "string", // Friend's user ID
    "page": 1, // Optional, default 1
    "limit": 50 // Optional, default 50
  }
  ```
- **Server emits:**
  - `chat_history` (with messages, friend info, page, hasMore)
  - `error` (if not friends or DB error)

---

### 3. `mark_messages_read`

- **Description:** Mark all messages from a friend as read.
- **Payload:**
  ```json
  {
    "friendId": "string" // Friend's user ID
  }
  ```
- **Server emits:**
  - `messages_marked_read` (with `friendId`)
  - `error` (on failure)

---

### 4. `typing_start`

- **Description:** Notify a friend that you started typing.
- **Payload:**
  ```json
  {
    "receiverId": "string" // Friend's user ID
  }
  ```
- **Server emits:**
  - `user_typing` (to receiver, with `userId` and `username`)

---

### 5. `typing_stop`

- **Description:** Notify a friend that you stopped typing.
- **Payload:**
  ```json
  {
    "receiverId": "string" // Friend's user ID
  }
  ```
- **Server emits:**
  - `user_stopped_typing` (to receiver, with `userId`)

---

## Events (Server → Client)

### 1. `new_message`

- **Description:** You received a new message.
- **Payload:**
  ```json
  {
    "id": "string",
    "senderId": "string",
    "senderInfo": {
      "username": "string",
      "firstName": "string",
      "lastName": "string",
      "profilePicture": "string"
    },
    "content": "string",
    "messageType": "string",
    "createdAt": "ISODate"
  }
  ```

### 2. `message_sent`

- **Description:** Confirmation that your message was sent.
- **Payload:** Same as above, but with `receiverId`.

### 3. `chat_history`

- **Description:** Chat history with a friend.
- **Payload:**
  ```json
  {
    "messages": [ ... ],   // Array of message objects
    "friend": { ... },     // Friend's user info
    "page": 1,
    "hasMore": true
  }
  ```

### 4. `messages_marked_read`

- **Description:** Confirmation that messages were marked as read.
- **Payload:**
  ```json
  { "friendId": "string" }
  ```

### 5. `user_typing`

- **Description:** A friend started typing.
- **Payload:**
  ```json
  {
    "userId": "string",
    "username": "string"
  }
  ```

### 6. `user_stopped_typing`

- **Description:** A friend stopped typing.
- **Payload:**
  ```json
  {
    "userId": "string"
  }
  ```

### 7. `error`

- **Description:** An error occurred (e.g., not friends, DB error).
- **Payload:**
  ```json
  { "message": "string" }
  ```

---

## Notes

- All events require the user to be authenticated via JWT.
- Only confirmed friends can send/receive messages or typing events.
- All message data is stored in MongoDB.
