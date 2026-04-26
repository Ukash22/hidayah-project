import os
import cloudinary
import cloudinary.api
from dotenv import load_dotenv

load_dotenv()

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET'),
    secure=True
)

import sys

def wipe_project_resources():
    print("Starting Cloudinary Wipe for Account: " + os.getenv('CLOUDINARY_CLOUD_NAME'))
    
    if len(sys.argv) < 2 or sys.argv[1] != '--confirm-wipe':
        print("❌ CRITICAL: Safety check failed.")
        print("Usage: python wipe_cloudinary.py --confirm-wipe")
        return

    try:
        # Delete all images
        print("Deleting images...")
        cloudinary.api.delete_all_resources(resource_type="image")
        
        # Delete all videos
        print("Deleting videos...")
        cloudinary.api.delete_all_resources(resource_type="video")
        
        # Delete all raw files (PDFs, docs)
        print("Deleting raw files...")
        cloudinary.api.delete_all_resources(resource_type="raw")
        
        print("\n========================================")
        print("WIPE COMPLETE!")
        print("========================================")
    except Exception as e:
        print(f"Error during wipe: {e}")

if __name__ == "__main__":
    wipe_project_resources()
