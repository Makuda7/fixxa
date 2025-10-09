# Portfolio Photos Fix - Summary

## Problem
Workers uploaded portfolio photos but they weren't showing up on their profile page (profile.html) when viewed by clients.

## Root Cause
1. **Missing Database Table**: The `portfolio_photos` table didn't exist in the schema
2. **Wrong API Endpoint**: The frontend (`profile.html`) was calling `/reviews/workers/${workerId}/completion-photos` but the portfolio photos were stored in a different system
3. **Endpoint Mismatch**: The backend had portfolio endpoints (`/workers/portfolio/:workerId`) but the frontend wasn't using them

## Solution Implemented

### 1. Database Migration
**File:** `database/migrations/add_portfolio_photos.sql`

Created the `portfolio_photos` table with:
- `id` - Auto-incrementing primary key
- `worker_id` - Foreign key to workers table
- `photo_url` - Path to the uploaded image
- `description` - Optional caption for the photo
- `uploaded_at` - Timestamp

**Migration applied successfully** - Table now exists in database.

### 2. Updated Database Schema
**File:** `database/schema.sql`

Added the portfolio_photos table definition to the main schema for future deployments.

### 3. Fixed Frontend
**File:** `public/profile.html`

Updated the `loadWorkGallery()` function to:
- Fetch from `/workers/portfolio/${workerId}` instead of completion photos endpoint
- Use correct field names: `photo_url`, `uploaded_at`, `description`
- Display portfolio photos in the work gallery section

## What Works Now

### For Workers
- Upload portfolio photos via `/workers/portfolio/upload` (POST)
- View their own photos via `/workers/portfolio` (GET)
- Delete photos via `/workers/portfolio/:photoId` (DELETE)

### For Clients
- View worker's portfolio photos on their profile page
- Photos displayed in a grid layout (up to 12 on main view)
- Click photos to view full size
- See upload date on each photo

## API Endpoints

### Upload Portfolio Photo
```
POST /workers/portfolio/upload
Headers: multipart/form-data
Body:
  - photo: File (JPEG, PNG, WEBP max 5MB)
  - description: String (optional)
Auth: Required (worker only)
```

### Get Worker's Portfolio (Public)
```
GET /workers/portfolio/:workerId
Response:
{
  "success": true,
  "photos": [
    {
      "id": 1,
      "worker_id": 1,
      "photo_url": "/uploads/portfolio/portfolio-xxx.png",
      "description": "Kitchen renovation",
      "uploaded_at": "2025-10-08T09:13:27.757Z"
    }
  ]
}
```

### Get Own Portfolio (Authenticated Worker)
```
GET /workers/portfolio
Auth: Required (worker only)
```

### Delete Portfolio Photo
```
DELETE /workers/portfolio/:photoId
Auth: Required (worker only)
```

## Testing

### Test Portfolio Display
1. Go to `http://localhost:3000/profile.html?worker=1`
2. Scroll to "Work Gallery" section
3. You should see 2 uploaded photos
4. Click any photo to view full size

### Test API Directly
```bash
# Get worker's portfolio
curl http://localhost:3000/workers/portfolio/1

# Expected response:
{
  "success": true,
  "photos": [...]
}
```

### Current Photos in Database
Worker ID 1 has 2 photos:
1. `portfolio-1759914807743-16461340.png` (uploaded Oct 8, 2025)
2. `portfolio-1759914823936-130476270.png` (uploaded Oct 8, 2025)

## Files Modified

1. **database/migrations/add_portfolio_photos.sql** (NEW)
   - Creates portfolio_photos table with indexes

2. **database/schema.sql** (UPDATED)
   - Added portfolio_photos table definition

3. **public/profile.html** (UPDATED)
   - Line 248: Changed endpoint from `/reviews/workers/${workerId}/completion-photos` to `/workers/portfolio/${workerId}`
   - Lines 255-256: Updated to use `photo_url`, `uploaded_at`, `description` fields
   - Line 276: Updated "no photos" message

## Upload Directory Structure
```
public/
  uploads/
    portfolio/           # Portfolio photos (worker showcase)
      portfolio-*.png
    reviews/            # Review photos (from completed jobs)
      review-*.png
    certifications/     # Worker certifications
      cert-*.pdf
```

## Security Notes
- File uploads limited to 5MB
- Only JPEG, PNG, WEBP formats allowed
- Files stored in `public/uploads/portfolio/` with unique names
- Authentication required for upload/delete
- Workers can only delete their own photos
- Public can view any worker's portfolio (read-only)

## Next Steps (Optional Enhancements)

1. **Add Photo Descriptions**
   - Update prosite.html to allow workers to add/edit descriptions
   - Display descriptions in the gallery

2. **Photo Reordering**
   - Add drag-and-drop to reorder portfolio photos
   - Add `display_order` column to portfolio_photos table

3. **Featured Photo**
   - Mark one photo as "featured" to show on worker cards
   - Add `is_featured` boolean column

4. **Photo Categories**
   - Allow workers to categorize photos (before/after, by project type)
   - Add `category` column

5. **Compression**
   - Add image compression on upload to reduce file sizes
   - Consider using Sharp or Jimp library

## Conclusion
Portfolio photos now display correctly on worker profile pages. The fix involved creating the missing database table, applying the migration, and updating the frontend to use the correct API endpoint.
