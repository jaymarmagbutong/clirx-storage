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
Retrieves the details of a specific folder along with its subfolders (`children`), files (`files`), and the recursive breadcrumbs path of parent folders (`path`).

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
      "files": [],
      "path": [
        {
          "id": 2,
          "name": "Root Projects",
          "parentId": null
        }
      ]
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

### 8b. View / Stream Thumbnail
Streams the pre-generated small-size thumbnail image (`200px` width) for a specific image or video file.

- **URL**: `/api/storage/thumbnails/:fileName`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer YOUR_JWT_TOKEN` *(Required ONLY for private file thumbnails)*

> [!IMPORTANT]
> - **Privacy Enforcement**: Private file thumbnails fully inherit the owner-only permission lock of the main file. Active JWT headers are verified, returning a `403 Forbidden` for other users or a `401 Unauthorized` if headers are omitted.

- **Success Response (`200 OK`)**:
  *(Inline JPEG image stream of the scaled thumbnail)*

#### Example Usage (Public Thumbnail)
```bash
curl http://localhost:8000/api/storage/thumbnails/thumb_1779817431230_ab79473a.jpg \
     --output thumb.jpg
```

#### Example Usage (Private Thumbnail)
```bash
curl http://localhost:8000/api/storage/thumbnails/thumb_1779817431230_ab79473a.jpg \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     --output thumb.jpg
```

---

### 9. Delete File (Soft Delete)
Soft-deletes a specific file from the active storage drive. The record is kept in the MySQL database (with `isDeleted` set to `true`) and the physical file remains safe on the disk under `uploads/`, allowing for easy restoration later via the Trash Bin.

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

---

### 9b. Update File Metadata (Single)
Updates the metadata configurations of a specific file. Used to rename parent folders, toggle public/private privacy, or restore/soft-delete a file manually.

- **URL**: `/api/storage/files/:fileName`
- **Method**: `PATCH`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_JWT_TOKEN`
- **Body Fields**:
  ```json
  {
    "folderId": 12,        // Optional. Parent folder ID to move the file, or null to move to Root Drive
    "isPrivate": false,    // Optional. Boolean value to set public/private status
    "isDeleted": false     // Optional. Set to false to restore a soft-deleted file!
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "id": 12,
    "uniqueName": "1779817431230_ab...",
    "folderId": 12,
    "isPrivate": false,
    "isDeleted": false
  }
  ```

#### Example Usage (Restoring a File)
```bash
curl -X PATCH http://localhost:8000/api/storage/files/1779817431230_ab79473a-5c9c-41d9-982e-97cdebd49a0a.png \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{"isDeleted": false}'
```

---

### 9c. Bulk Update Files Metadata
Performs a fast database-transaction-safe update across multiple file records owned by the user.

- **URL**: `/api/storage/files/bulk-update`
- **Method**: `POST`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_JWT_TOKEN`
- **Body**:
  ```json
  {
    "fileIds": [12, 13, 14],
    "folderId": 5,          // Optional. Move all to Folder ID 5 (or null for Root)
    "isPrivate": true,       // Optional. Set all selected files to private
    "isDeleted": false      // Optional. Restore all selected files
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "count": 3
  }
  ```

---

### 9d. Bulk Delete Files (Soft Delete)
Soft-deletes multiple file records in batch using a single database operation.

- **URL**: `/api/storage/files/bulk-delete`
- **Method**: `POST`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_JWT_TOKEN`
- **Body**:
  ```json
  {
    "fileIds": [12, 13, 14]
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Files deleted successfully",
    "count": 3
  }
  ```

---

## 🗑️ Trash Bin Operations

### 10. List Soft-Deleted Files
Retrieves all files belonging to the authenticated user that are currently in the soft-deleted state (`isDeleted: true`).

- **URL**: `/api/storage/files/deleted`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer YOUR_JWT_TOKEN`
- **Success Response (`200 OK`)**:
  ```json
  [
    {
      "id": 12,
      "originalName": "image.png",
      "uniqueName": "1779817431230_ab79473a-5c9c-41d9-982e-97cdebd49a0a.png",
      "size": 42104,
      "isDeleted": true,
      "uploadedAt": "2026-05-26T17:43:51.000Z"
    }
  ]
  ```

---

### 11. Permanently Delete File
Irreversibly unlinks the physical asset upload from disk, deletes its generated thumbnail image under `uploads/thumbnails/`, and deletes the database record row from MySQL.

- **URL**: `/api/storage/files/:fileName/permanent`
- **Method**: `DELETE`
- **Headers**:
  - `Authorization: Bearer YOUR_JWT_TOKEN`
- **Success Response (`200 OK`)**:
  ```json
  {
    "message": "File permanently deleted"
  }
  ```

---

### 12. Empty Trash Bin
Recursively unlinks every single physical asset and thumbnail file belonging to soft-deleted files of the authenticated owner, and clears their rows from the database in a transaction block.

- **URL**: `/api/storage/files/empty-trash`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer YOUR_JWT_TOKEN`
- **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Trash emptied successfully",
    "count": 14
  }
  ```

---

## ⚡ API Pagination Support
Both the active folder details endpoint and general file list retrieval support dynamic pagination to optimize server request memory.

### Parameters
Pass these query parameters:
*   `page`: (Optional integer, e.g. `page=2`. Default is `1`)
*   `limit`: (Optional integer, e.g. `limit=15`. Default is `30`)

### Endpoints Supported
*   `GET /api/storage/files?page=1&limit=30`
*   `GET /api/folder/:id?page=1&limit=30`

### Success Response Layout
When pagination query parameters are provided, the API automatically transitions to a structured JSON response schema:
```json
{
  "files": [ ... ],
  "hasMore": true,
  "total": 143
}
```
*(If no `page` query parameter is supplied, the endpoints gracefully fallback to their default flat array representation to maintain 100% backward-compatibility with older client code.)*

---

## 🔄 Resume-Capable Chunked Uploads
Enables large files to be sliced into standard `10MB` blobs on the client side, sequentially uploaded, tracked, paused, and resumed cleanly.

### 13. Get Upload Status
Checks which chunk indices for a specific unique file signature have already been received and saved on the server. Allows the client to bypass already uploaded chunks during resume events.

- **URL**: `/api/storage/upload/status`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer YOUR_JWT_TOKEN`
- **Query Parameters**:
  - `identifier`: (A unique hash signature string for the file, e.g. `${size}_${name_without_spaces}`)
- **Success Response (`200 OK`)**:
  ```json
  {
    "uploadedChunks": [0, 1, 2, 3]
  }
  ```

---

### 14. Upload Chunk
Uploads an individual byte-chunk of a file. When the final chunk index is received, the server automatically merges all chunks sequentially, generates image/video thumbnails, purges temporary slice folders, and registers the final file metadata in the MySQL database.

- **URL**: `/api/storage/upload/chunk`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer YOUR_JWT_TOKEN`
  - *(Uses multipart form-data)*
- **Body Fields**:
  - `file`: (Binary data of the specific 10MB chunk)
  - `identifier`: (Unique file identifier hash string)
  - `chunkIndex`: (Integer index of current chunk starting at `0`)
  - `totalChunks`: (Total number of slices)
  - `originalName`: (Original filename, e.g. `heavy_movie.mp4`)
  - `folderId`: (Optional. Parent directory ID)
  - `isPrivate`: (Optional. Privacy indicator: `"true"` or `"false"`)

- **Success Response for Intermediate Chunk (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Chunk 4 uploaded successfully"
  }
  ```

- **Success Response for Final Chunk Merge (`201 Created`)**:
  ```json
  {
    "success": true,
    "message": "File uploaded and merged successfully",
    "file": {
      "id": 84,
      "originalName": "heavy_movie.mp4",
      "uniqueName": "1779841298412_a8b94.mp4",
      "filePath": "http://localhost:8000/api/storage/files/1779841298412_a8b94.mp4",
      "size": 145920310,
      "uploadedAt": "2026-05-28T16:30:00.000Z",
      "thumbnail": "http://localhost:8000/api/storage/thumbnails/thumb_1779841298412_a8b94.jpg"
    }
  }
  ```
