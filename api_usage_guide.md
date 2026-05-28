# API Usage Guide: `storage-api`

This document provides a comprehensive overview of how to interact with the resolved `storage-api` service.

All endpoints are hosted by default on: **`http://localhost:8000`**

---

## 🔐 Authentication & Session Endpoints

### 1. User Login
Authenticates user credentials against the MySQL database and retrieves a JWT authorization token.

- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "email": "magbutongjaymar@gmail.com",
    "password": "password"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

#### Example Usage
```bash
curl -X POST http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "magbutongjaymar@gmail.com", "password": "password"}'
```

---

### 2. Verify Token
Verifies if a specific JWT token is active and valid.

- **URL**: `/api/auth/verify/:token`
- **Method**: `GET`
- **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Token is valid",
    "decoded": {
      "userId": 1,
      "email": "magbutongjaymar@gmail.com",
      "iat": 1779817431,
      "exp": 2095393431
    }
  }
  ```

#### Example Usage
```bash
curl http://localhost:8000/api/auth/verify/YOUR_JWT_TOKEN
```

---

### 3. Sign Out (Revoke Token)
Blacklists a valid JWT token to prevent future requests.

- **URL**: `/api/auth/logout`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "token": "YOUR_JWT_TOKEN"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Logout successful"
  }
  ```

---

## 👥 User Administration

### 4. Register User
Registers a new user inside the MySQL database. 

> [!NOTE]
> In the current design, registration itself requires authentication. You must pass a valid user's token in the `Authorization` header to create new users.

- **URL**: `/api/user/register`
- **Method**: `POST`
- **Headers**: 
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_JWT_TOKEN`
- **Body**:
  ```json
  {
    "email": "newuser@example.com",
    "password": "securepassword"
  }
  ```
- **Success Response (`201 Created`)**:
  ```json
  {
    "message": "User created",
    "user": {
      "id": 2,
      "email": "newuser@example.com",
      "createdAt": "2026-05-26T17:43:51.191Z"
    }
  }
  ```
- **Error Response (`400 Bad Request`)**:
  ```json
  {
    "error": "Email already registered"
  }
  ```

#### Example Usage
```bash
curl -X POST http://localhost:8000/api/user/register \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{"email": "newuser@example.com", "password": "securepassword"}'
```

---

## 📁 Folders Operations

### 5. Create Folder
Creates a new directory structure for organizing files.

- **URL**: `/api/folder/create`
- **Method**: `POST`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_JWT_TOKEN`
- **Body**:
  ```json
  {
    "name": "Documents",
    "parentId": null 
  }
  ```
  *(Set `parentId` to an integer ID of a parent folder to nest it, or omit/set to `null` for root level.)*
- **Success Response (`201 Created`)**:
  ```json
  {
    "folder": {
      "id": 5,
      "name": "Documents",
      "parentId": null,
      "ownerId": 1,
      "createdAt": "2026-05-26T17:43:51.213Z",
      "updatedAt": "2026-05-26T17:43:51.213Z"
    }
  }
  ```

#### Example Usage
```bash
curl -X POST http://localhost:8000/api/folder/create \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{"name": "Documents"}'
```

---

### 5b. List All Folders
Retrieves all folders owned by the authenticated user.

- **URL**: `/api/folder/list`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer YOUR_JWT_TOKEN`
- **Success Response (`200 OK`)**:
  ```json
  {
    "folders": [
      {
        "id": 5,
        "name": "Documents",
        "parentId": null,
        "ownerId": 1,
        "createdAt": "2026-05-26T17:43:51.213Z",
        "updatedAt": "2026-05-26T17:43:51.213Z"
      }
    ]
  }
  ```

#### Example Usage
```bash
curl http://localhost:8000/api/folder/list \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 5c. Get Folder (With Contents)
Retrieves the details of a specific folder along with its subfolders (`children`) and files (`files`).

- **URL**: `/api/folder/:id`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer YOUR_JWT_TOKEN`
- **Success Response (`200 OK`)**:
  ```json
  {
    "folder": {
      "id": 5,
      "name": "Documents",
      "parentId": null,
      "ownerId": 1,
      "createdAt": "2026-05-26T17:43:51.213Z",
      "updatedAt": "2026-05-26T17:43:51.213Z",
      "children": [],
      "files": []
    }
  }
  ```

#### Example Usage
```bash
curl http://localhost:8000/api/folder/5 \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 5d. Rename Folder
Renames an existing folder record in the system.

- **URL**: `/api/folder/:id`
- **Method**: `PATCH`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_JWT_TOKEN`
- **Body**:
  ```json
  {
    "name": "New Folder Name"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "folder": {
      "id": 5,
      "name": "New Folder Name",
      "parentId": null,
      "ownerId": 1,
      "createdAt": "2026-05-26T17:43:51.213Z",
      "updatedAt": "2026-05-28T08:02:00.000Z"
    }
  }
  ```

#### Example Usage
```bash
curl -X PATCH http://localhost:8000/api/folder/5 \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{"name": "New Folder Name"}'
```

---

### 5e. Delete Folder (Recursive)
Permanently unlinks all physical file assets in this folder and its subdirectories from disk, and deletes the Prisma database records in cascade order.

- **URL**: `/api/folder/:id`
- **Method**: `DELETE`
- **Headers**:
  - `Authorization: Bearer YOUR_JWT_TOKEN`
- **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Folder and its contents deleted successfully"
  }
  ```

#### Example Usage
```bash
curl -X DELETE http://localhost:8000/api/folder/5 \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 💾 File Operations

### 6. Upload File(s)
Uploads one or more physical files to the server. Files are stored inside the `uploads/` directory on disk, and registered under the database dynamically mapped to the authenticated user and target folder.

- **URL**: `/api/storage/upload`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer YOUR_JWT_TOKEN`
  - *(Uses multipart form-data)*
- **Body Fields**:
  - `file`: (Binary data of file to upload)
  - `folderId`: (Optional integer ID of target folder to place file in)
  - `isPrivate`: (Optional boolean or string `"true"` / `"false"`. If set to `true`, only the owner can access it)

> [!TIP]
> The `isPrivate` parameter can also be passed as a query string parameter (e.g. `/api/storage/upload?isPrivate=true`).

- **Success Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "data": {
      "baseurl": "http://localhost:8000/api/storage/files/",
      "messages": [
        "File uploaded successfully"
      ],
      "files": [
        "1779817431230_ab79473a-5c9c-41d9-982e-97cdebd49a0a.txt"
      ],
      "isImages": [
        false
      ]
    }
  }
  ```

#### Example Usage (Public Upload)
```bash
curl -X POST http://localhost:8000/api/storage/upload \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -F "file=@/path/to/local/image.png" \
     -F "folderId=5"
```

#### Example Usage (Private Upload)
```bash
curl -X POST http://localhost:8000/api/storage/upload \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -F "file=@/path/to/local/private_doc.pdf" \
     -F "isPrivate=true"
```

---

### 7. List Files
Retrieves all files registered in the system.

- **URL**: `/api/storage/files`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer YOUR_JWT_TOKEN`
- **Success Response (`200 OK`)**:
  ```json
  [
    {
      "id": 12,
      "folderId": 5,
      "ownerId": 1,
      "originalName": "image.png",
      "uniqueName": "1779817431230_ab79473a-5c9c-41d9-982e-97cdebd49a0a.png",
      "filePath": "http://localhost:8000/api/storage/files/1779817431230_ab79473a-5c9c-41d9-982e-97cdebd49a0a.png",
      "size": 42104,
      "uploadedAt": "2026-05-26T17:43:51.000Z"
    }
  ]
  ```

#### Example Usage
```bash
curl http://localhost:8000/api/storage/files \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 8. Download / View File
Streams or downloads a specific physical file from the storage.

- **URL**: `/api/storage/files/:fileName`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer YOUR_JWT_TOKEN` *(Required ONLY for private files)*

> [!IMPORTANT]
> - **Public Files**: Anyone can access public files without providing the `Authorization` header.
> - **Private Files**: Requires the `Authorization` header with a valid JWT token. Access is strictly authorized ONLY if the authenticated user's ID matches the file owner's ID. Otherwise, a `401 Unauthorized` or `403 Forbidden` response is returned.

- **Success Response (`200 OK`)**:
  *(Raw file stream returned directly with appropriate Mimetype header)*

#### Example Usage (Public File)
```bash
curl http://localhost:8000/api/storage/files/1779817431230_ab79473a-5c9c-41d9-982e-97cdebd49a0a.png \
     --output downloaded_image.png
```

#### Example Usage (Private File)
```bash
curl http://localhost:8000/api/storage/files/1779817431230_ab79473a-5c9c-41d9-982e-97cdebd49a0a.png \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     --output downloaded_image.png
```

---

### 9. Delete File
Permanently unlinks the physical file from disk and deletes its metadata record from the Prisma MySQL database.

- **URL**: `/api/storage/files/:fileName`
- **Method**: `DELETE`
- **Headers**:
  - `Authorization: Bearer YOUR_JWT_TOKEN`
- **Success Response (`200 OK`)**:
  ```json
  {
    "message": "File deleted successfully"
  }
  ```

#### Example Usage
```bash
curl -X DELETE http://localhost:8000/api/storage/files/1779817431230_ab79473a-5c9c-41d9-982e-97cdebd49a0a.png \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
