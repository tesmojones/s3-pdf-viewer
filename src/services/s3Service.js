import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// AWS S3 configuration from environment variables
const s3Client = new S3Client({
  region: import.meta.env.VITE_AWS_REGION,
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = import.meta.env.VITE_S3_BUCKET_NAME;

// List all PDFs in the bucket
export const listPDFs = async () => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: '', // You can filter by prefix if needed
    });

    const response = await s3Client.send(command);
    // Filter to only include files with .pdf extension (case insensitive)
    const pdfFiles = (response.Contents || []).filter(file => 
      file.Key.toLowerCase().endsWith('.pdf')
    );
    return pdfFiles;
  } catch (error) {
    console.error('Error listing PDFs:', error);
    throw error;
  }
};

// Get a signed URL for viewing a PDF
export const getPDFUrl = async (key) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    // URL will be valid for 1 hour (3600 seconds)
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  } catch (error) {
    console.error('Error getting PDF URL:', error);
    throw error;
  }
};

// Upload a PDF to S3
export const uploadPDF = async (file) => {
  try {
    // Read the file as an ArrayBuffer instead of passing the File object directly
    const fileContent = await file.arrayBuffer();
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: file.name,
      Body: fileContent, // Use the ArrayBuffer instead of the File object
      ContentType: 'application/pdf',
    });

    await s3Client.send(command);
    return { success: true, key: file.name };
  } catch (error) {
    console.error('Error uploading PDF:', error);
    throw error;
  }
};

// Save bookmark for a PDF
export const saveBookmark = async (key, page) => {
  // In a real application, you might want to store this in a database
  // For simplicity, we'll use localStorage
  try {
    const bookmarks = JSON.parse(localStorage.getItem('pdfBookmarks') || '{}');
    bookmarks[key] = page;
    localStorage.setItem('pdfBookmarks', JSON.stringify(bookmarks));
    return { success: true };
  } catch (error) {
    console.error('Error saving bookmark:', error);
    throw error;
  }
};

// Get bookmark for a PDF
export const getBookmark = (key) => {
  try {
    const bookmarks = JSON.parse(localStorage.getItem('pdfBookmarks') || '{}');
    return bookmarks[key] || 1; // Default to page 1 if no bookmark exists
  } catch (error) {
    console.error('Error getting bookmark:', error);
    return 1; // Default to page 1 on error
  }
};