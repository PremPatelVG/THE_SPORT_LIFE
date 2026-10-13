# Profile Picture Upload Feature

## Overview
Users can now upload and update their profile pictures from the Profile Edit section. Images are stored locally in the backend's `uploads/profiles` directory.

## Backend Implementation

### 1. Upload Middleware (`src/middleware/upload.js`)
- **Multer Configuration**: Handles multipart/form-data file uploads
- **Storage**: Local disk storage in `uploads/profiles/`
- **Filename Format**: `user_{userId}_{timestamp}.{extension}`
- **File Validation**:
  - Allowed types: jpeg, jpg, png, gif, webp
  - Max file size: 5MB
- **Auto-creates** uploads directory if it doesn't exist

### 2. Controller (`src/controllers/authController.js`)
**New Function**: `uploadProfilePicture`
- **Route**: `POST /api/v1/auth/profile/picture`
- **Authentication**: Required (auth middleware)
- **Process**:
  1. Validates file exists
  2. Saves file to `uploads/profiles/`
  3. Updates user's `profile_image` field in database
  4. Returns updated user data with image path

### 3. Routes (`src/routes/auth.routes.js`)
```javascript
router.post('/profile/picture', auth, upload.single('profile_image'), authController.uploadProfilePicture);
```

### 4. Static File Serving (`src/app.js`)
```javascript
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
```
- Uploaded images accessible at: `http://localhost:5000/uploads/profiles/{filename}`

## Frontend Implementation

### 1. Profile Component Updates (`src/pages/Profile.jsx`)

**New State:**
- `uploadingImage`: Loading state during upload
- `profileImagePreview`: Preview of selected image before upload

**New Function**: `handleProfileImageChange`
- Validates file type (images only)
- Validates file size (max 5MB)
- Shows preview immediately
- Uploads to backend via FormData
- Refreshes profile data on success

**UI Changes:**
- Profile picture with camera icon overlay
- Click camera icon to upload new image
- Shows loading spinner during upload
- Displays uploaded image or initials fallback
- Smooth transitions and hover effects

### 2. Image Display
```javascript
{profileImagePreview || profile?.profile_image ? (
  <img
    src={profileImagePreview || `${import.meta.env.VITE_API_URL}${profile?.profile_image}`}
    alt="Profile"
    className="w-24 h-24 rounded-full object-cover shadow-xl"
  />
) : (
  <div className="initials-fallback">
    {profile?.first_name?.[0]}{profile?.last_name?.[0]}
  </div>
)}
```

## API Endpoints

### Upload Profile Picture
**POST** `/api/v1/auth/profile/picture`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Body:**
```
profile_image: <file>
```

**Response:**
```json
{
  "success": true,
  "message": "Profile picture uploaded successfully",
  "data": {
    "profile_image": "/uploads/profiles/user_1_1234567890.jpg",
    "user": {
      "id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "profile_image": "/uploads/profiles/user_1_1234567890.jpg",
      ...
    }
  }
}
```

## File Structure

```
sportlife-backend/
├── uploads/
│   └── profiles/
│       ├── user_1_1698765432123.jpg
│       ├── user_2_1698765433456.png
│       └── ...
├── src/
│   ├── middleware/
│   │   └── upload.js          # Multer configuration
│   ├── controllers/
│   │   └── authController.js  # uploadProfilePicture function
│   ├── routes/
│   │   └── auth.routes.js     # POST /profile/picture route
│   └── app.js                 # Static file serving
```

## Features

✅ **Upload**: Click camera icon to select and upload image
✅ **Preview**: Instant preview before upload
✅ **Validation**: File type and size validation
✅ **Storage**: Local file storage in uploads directory
✅ **Database**: Image path stored in users table
✅ **Display**: Shows uploaded image or initials fallback
✅ **Loading State**: Spinner during upload
✅ **Error Handling**: User-friendly error messages
✅ **Auto-refresh**: Profile data refreshes after upload

## Environment Variables

Make sure `VITE_API_URL` is set in frontend `.env`:
```
VITE_API_URL=http://localhost:5000
```

## Security Considerations

1. **File Type Validation**: Only image files allowed
2. **File Size Limit**: 5MB maximum
3. **Authentication Required**: Must be logged in
4. **Unique Filenames**: Prevents overwriting
5. **User-specific**: Each user can only update their own picture

## Future Enhancements

- [ ] Image compression before upload
- [ ] Crop/resize functionality
- [ ] Cloud storage integration (AWS S3, Cloudinary)
- [ ] Delete old profile pictures when uploading new ones
- [ ] Image optimization (WebP format)
- [ ] Multiple image sizes (thumbnail, medium, large)
