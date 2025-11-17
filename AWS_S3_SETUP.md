# AWS S3 Image Storage Setup Guide

This guide explains how to set up AWS S3 for storing product images in your application.

## Prerequisites

- AWS Account
- AWS CLI installed (optional, for testing)

## Step 1: Create S3 Bucket

1. Log in to AWS Console
2. Navigate to S3 service
3. Click "Create bucket"
4. Configure bucket:
   - **Bucket name**: Choose a unique name (e.g., `your-app-product-images`)
   - **Region**: Choose your preferred region (e.g., `us-east-1`)
   - **Block Public Access**: Uncheck "Block all public access" (or configure bucket policy)
   - **Versioning**: Optional
   - **Encryption**: Optional (default encryption is fine)
5. Click "Create bucket"

## Step 2: Configure Bucket Policy

1. Go to your bucket → Permissions → Bucket Policy
2. Add the following policy (replace `your-bucket-name` with your actual bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

## Step 3: Configure CORS

1. Go to your bucket → Permissions → CORS
2. Add the following CORS configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

## Step 4: Create IAM User

1. Navigate to IAM → Users → Add users
2. Create a user with programmatic access
3. Attach the following policy (or create a custom policy):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

4. Save the Access Key ID and Secret Access Key

## Step 5: Configure Environment Variables

Add the following to your `.env` file in `pos-backend`:

```env
AWS_ACCESS_KEY_ID=your_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_secret_access_key_here
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_S3_BUCKET_URL=https://your-bucket-name.s3.amazonaws.com
```

**Important**: Never commit your `.env` file to version control!

## Step 6: Test the Setup

### Backend Test

You can test the image upload endpoint using Postman or curl:

```bash
curl -X POST http://localhost:3001/images/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@/path/to/your/image.jpg"
```

### Frontend Test

Use the `ImageUpload` component in your forms:

```tsx
import ImageUpload from '@/components/ImageUpload';

function ProductForm() {
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  return (
    <form>
      <ImageUpload
        maxImages={3}
        onImagesChange={setImageUrls}
        existingImages={imageUrls}
      />
      {/* Rest of your form */}
    </form>
  );
}
```

## API Endpoints

### Upload Single Image
- **Endpoint**: `POST /images/upload`
- **Auth**: Required (Admin/Cashier only)
- **Body**: FormData with `image` field
- **Response**: `{ url: "https://bucket.s3.amazonaws.com/products/..." }`

### Upload Multiple Images
- **Endpoint**: `POST /images/upload-multiple`
- **Auth**: Required (Admin/Cashier only)
- **Body**: FormData with `images` field (array)
- **Response**: `{ urls: ["url1", "url2", "url3"] }`

### Delete Image
- **Endpoint**: `DELETE /images/:key`
- **Auth**: Required (Admin/Cashier only)
- **Response**: `{ message: "Image deleted successfully" }`

## Image Display

Images stored in S3 can be displayed directly using the URL:

```tsx
import Image from 'next/image';

<Image
  src="https://your-bucket.s3.amazonaws.com/products/image.jpg"
  alt="Product image"
  width={300}
  height={300}
/>
```

Or use the `ProductImage` component for better error handling:

```tsx
import ProductImage from '@/components/ProductImage';

<ProductImage
  src={product.images[0]}
  alt={product.name}
  width={300}
  height={300}
/>
```

## File Structure

Images are stored in S3 with the following structure:
```
your-bucket/
  └── products/
      ├── 1234567890-abc123def456.jpg
      ├── 1234567891-xyz789ghi012.png
      └── ...
```

## Security Considerations

1. **Access Control**: Only Admin and Cashier roles can upload/delete images
2. **File Validation**: Only JPEG, PNG, and WebP images are allowed
3. **File Size Limit**: Maximum 5MB per image
4. **Rate Limiting**: Upload endpoints are rate-limited
5. **Bucket Policy**: Configure bucket policy to allow public read access only

## Troubleshooting

### Error: "AWS credentials are not configured"
- Check that all environment variables are set correctly
- Restart your backend server after adding environment variables

### Error: "Access Denied"
- Verify IAM user has correct permissions
- Check bucket policy allows public read access
- Ensure CORS is configured correctly

### Images not displaying
- Verify bucket policy allows public read access
- Check image URLs are correct
- Ensure CORS is configured for your frontend domain

## Cost Optimization

- Use S3 Lifecycle policies to move old images to cheaper storage tiers
- Consider CloudFront CDN for better performance
- Enable S3 Transfer Acceleration for faster uploads (optional)

## Next Steps

- Set up CloudFront CDN for better image delivery
- Implement image compression before upload
- Add image resizing for thumbnails
- Set up S3 Lifecycle policies for cost optimization
