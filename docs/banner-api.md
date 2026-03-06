# Banner Management API

## Overview
Complete banner management system with image upload, CRUD operations, and bulk delete functionality. All images are stored in Cloudinary with automatic cleanup.

## Base URL
```
/api/banners
```

## Authentication
All endpoints except GET operations require authentication with a valid JWT token.

## Endpoints

### 1. Create Banner
**POST** `/api/banners`

Create a new banner with image upload.

**Headers:**
- `Authorization: Bearer <jwt-token>`
- `Content-Type: multipart/form-data`

**Body:**
```
profileImage: File (required) - Banner image file
title: string (required, max 100 chars) - Banner title
description: string (required, max 500 chars) - Banner description
altText: string (required, max 100 chars) - Alt text for accessibility
isActive: boolean (optional, default: true) - Banner visibility
displayOrder: number (optional, default: 0) - Display order
```

**Response:**
```json
{
  "success": true,
  "message": "Banner created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Summer Sale",
    "description": "Get 50% off on all items",
    "altText": "Summer sale banner with discount text",
    "bannerImage": "https://res.cloudinary.com/...",
    "bannerImagePublicId": "banner_1640000000000",
    "isActive": true,
    "displayOrder": 1,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Get All Banners
**GET** `/api/banners`

Retrieve all banners with pagination and filtering.

**Query Parameters:**
- `page: number` (optional, default: 1) - Page number
- `limit: number` (optional, default: 10, max: 100) - Items per page
- `isActive: boolean` (optional) - Filter by active status
- `sortBy: string` (optional, default: displayOrder) - Sort field (title, displayOrder, createdAt, updatedAt)
- `sortOrder: string` (optional, default: asc) - Sort direction (asc, desc)

**Example:** `GET /api/banners?page=1&limit=10&isActive=true&sortBy=displayOrder&sortOrder=asc`

**Response:**
```json
{
  "success": true,
  "message": "Banners retrieved successfully",
  "data": {
    "banners": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "title": "Summer Sale",
        "description": "Get 50% off on all items",
        "altText": "Summer sale banner with discount text",
        "bannerImage": "https://res.cloudinary.com/...",
        "bannerImagePublicId": "banner_1640000000000",
        "isActive": true,
        "displayOrder": 1,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10
    }
  }
}
```

### 3. Get Banner by ID
**GET** `/api/banners/:id`

Retrieve a specific banner by ID.

**Response:**
```json
{
  "success": true,
  "message": "Banner retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Summer Sale",
    "description": "Get 50% off on all items",
    "altText": "Summer sale banner with discount text",
    "bannerImage": "https://res.cloudinary.com/...",
    "bannerImagePublicId": "banner_1640000000000",
    "isActive": true,
    "displayOrder": 1,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. Update Banner
**PUT** `/api/banners/:id`

Update banner details and optionally replace the image.

**Headers:**
- `Authorization: Bearer <jwt-token>`
- `Content-Type: multipart/form-data`

**Body:**
```
profileImage: File (optional) - New banner image file
title: string (optional, max 100 chars) - Updated title
description: string (optional, max 500 chars) - Updated description
altText: string (optional, max 100 chars) - Updated alt text
isActive: boolean (optional) - Updated visibility
displayOrder: number (optional) - Updated display order
```

**Response:**
```json
{
  "success": true,
  "message": "Banner updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Updated Summer Sale",
    "description": "Get 60% off on all items",
    "altText": "Updated summer sale banner",
    "bannerImage": "https://res.cloudinary.com/...",
    "bannerImagePublicId": "banner_1640000000001",
    "isActive": true,
    "displayOrder": 2,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T01:00:00.000Z"
  }
}
```

### 5. Delete Banner
**DELETE** `/api/banners/:id`

Delete a banner and remove its image from Cloudinary.

**Headers:**
- `Authorization: Bearer <jwt-token>`

**Response:**
```json
{
  "success": true,
  "message": "Banner deleted successfully"
}
```

### 6. Bulk Delete Banners
**DELETE** `/api/banners/bulk-delete`

Delete multiple banners and remove their images from Cloudinary.

**Headers:**
- `Authorization: Bearer <jwt-token>`
- `Content-Type: application/json`

**Body:**
```json
{
  "bannerIds": [
    "507f1f77bcf86cd799439011",
    "507f1f77bcf86cd799439012",
    "507f1f77bcf86cd799439013"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk delete completed",
  "data": {
    "requested": 3,
    "deleted": 3,
    "imagesDeleted": 3,
    "imagesFailed": 0
  }
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE",
  "statusCode": 400
}
```

### Common Error Codes:
- `VALIDATION_ERROR` - Invalid input data
- `MISSING_REQUIRED_FIELDS` - Required fields are missing
- `MISSING_IMAGE_FILE` - Image file is required
- `NOT_FOUND` - Banner not found
- `BANNER_CREATION_FAILED` - Failed to create banner
- `BANNER_IMAGE_UPDATE_FAILED` - Failed to update banner image
- `MISSING_BANNER_IDS` - Banner IDs array is required
- `NO_BANNERS_FOUND` - No banners found with provided IDs

## File Upload Requirements

- **File Type:** Images only (JPEG, PNG, GIF, WebP)
- **File Size:** Maximum 5MB
- **Field Name:** `profileImage` (for upload)
- **Storage:** Cloudinary with automatic optimization

## Features

### Automatic Image Management
- Images are automatically uploaded to Cloudinary
- Old images are deleted when updating banners
- Images are removed from Cloudinary when banners are deleted
- Bulk delete handles image cleanup for multiple banners

### Image Optimization
- Automatic conversion to WebP format
- Smart cropping and resizing (500x500, face detection)
- Quality optimization
- Responsive delivery

### Security
- JWT authentication for all write operations
- Input validation and sanitization
- File type and size restrictions
- Rate limiting

### Performance
- Database indexing for fast queries
- Pagination for large datasets
- Efficient bulk operations
- Optimized image delivery
