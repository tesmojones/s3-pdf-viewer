import { useState } from 'react';
import { uploadPDF } from '../../services/s3Service';
import { Button, Box, Typography, LinearProgress, Paper, Alert, IconButton } from '@mui/material';
import { CloudUpload, Close } from '@mui/icons-material';

const PDFUpload = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
    } else {
      setSelectedFile(null);
      setError('Please select a valid PDF file');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a PDF file first');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(false);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 200);

      // Upload the file
      const result = await uploadPDF(selectedFile);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (result.success) {
        setSuccess(true);
        setSelectedFile(null);
        // Notify parent component about successful upload
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
      // Reset progress after a delay
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setError(null);
  };

  const handleCloseAlert = () => {
    setSuccess(false);
    setError(null);
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Upload New PDF
      </Typography>
      
      {(error || success) && (
        <Alert 
          severity={error ? 'error' : 'success'}
          sx={{ mb: 2 }}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={handleCloseAlert}
            >
              <Close fontSize="inherit" />
            </IconButton>
          }
        >
          {error || 'PDF uploaded successfully!'}
        </Alert>
      )}
      
      <Box sx={{ mb: 2 }}>
        <input
          accept="application/pdf"
          style={{ display: 'none' }}
          id="pdf-file-input"
          type="file"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <label htmlFor="pdf-file-input">
          <Button
            variant="outlined"
            component="span"
            startIcon={<CloudUpload />}
            disabled={uploading}
            fullWidth
          >
            Select PDF File
          </Button>
        </label>
      </Box>
      
      {selectedFile && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="body2" sx={{ flexGrow: 1, mr: 1 }} noWrap>
            {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
          </Typography>
          <IconButton size="small" onClick={handleClearFile} disabled={uploading}>
            <Close fontSize="small" />
          </IconButton>
        </Box>
      )}
      
      {uploadProgress > 0 && (
        <Box sx={{ width: '100%', mb: 2 }}>
          <LinearProgress variant="determinate" value={uploadProgress} />
        </Box>
      )}
      
      <Button
        variant="contained"
        color="primary"
        onClick={handleUpload}
        disabled={!selectedFile || uploading}
        fullWidth
      >
        {uploading ? 'Uploading...' : 'Upload PDF'}
      </Button>
    </Paper>
  );
};

export default PDFUpload;