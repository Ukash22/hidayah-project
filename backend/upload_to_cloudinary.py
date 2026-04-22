import os
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

# Load Cloudinary credentials from .env
load_dotenv()

cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET'),
    secure=True
)

MEDIA_ROOT = os.path.join(os.path.dirname(__file__), 'media')

def mass_upload():
    print(f"Starting mass upload from {MEDIA_ROOT} to Cloudinary...")
    
    # Supported file extensions (images, videos, documents)
    supported_extensions = ('.jpg', '.jpeg', '.png', '.gif', '.pdf', '.mp4', '.mp3', '.wav', '.mov', '.avi')
    
    total_files = 0
    success_count = 0
    fail_count = 0

    for root, dirs, files in os.walk(MEDIA_ROOT):
        for file in files:
            if not file.lower().endswith(supported_extensions):
                continue
            
            file_path = os.path.join(root, file)
            # Create a relative path for the public_id (e.g., tutor_recitations/sample.mp4)
            relative_path = os.path.relpath(file_path, MEDIA_ROOT).replace('\\', '/')
            
            # Remove extension from public_id for Cloudinary (they add it back automatically for some types, but naming is cleaner)
            # We'll keep the extension in the public_id to exactly match Django's FileField storage behavior
            public_id = relative_path

            print(f"Uploading: {public_id} ...", end='\r')
            
            try:
                # Use 'raw' for PDFs and others, 'video' for MP4, 'image' for others.
                # Cloudinary usually auto-detects, but explicit 'resource_type' handles large videos better.
                resource_type = 'auto'
                if file.lower().endswith(('.mp4', '.mov', '.avi')):
                    resource_type = 'video'
                elif file.lower().endswith('.pdf'):
                    resource_type = 'raw'

                cloudinary.uploader.upload(
                    file_path,
                    public_id=public_id,
                    resource_type=resource_type,
                    overwrite=True,
                    invalidate=True
                )
                print(f"Successfully uploaded: {public_id}          ")
                success_count += 1
            except Exception as e:
                print(f"\nFAILED to upload {public_id}: {str(e)}")
                fail_count += 1
            
            total_files += 1

    print("\n" + "="*40)
    print(f"Migration Finished!")
    print(f"Total processed: {total_files}")
    print(f"Success: {success_count}")
    print(f"Failures: {fail_count}")
    print("="*40)

if __name__ == '__main__':
    mass_upload()
