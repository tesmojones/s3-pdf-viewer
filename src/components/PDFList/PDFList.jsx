import { useState, useEffect, useRef } from 'react';
import { listPDFs, getPDFUrl } from '../../services/s3Service';
import { List, ListItem, ListItemText, ListItemButton, Typography, Paper, Box, CircularProgress, Avatar } from '@mui/material';
import { InsertDriveFile } from '@mui/icons-material';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
import 'pdfjs-dist/build/pdf.worker.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.mjs';

const PDFList = ({ onSelectPDF }) => {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [thumbnails, setThumbnails] = useState({});

  useEffect(() => {
    const fetchPDFs = async () => {
      try {
        setLoading(true);
        const pdfList = await listPDFs();
        // Sort PDFs by last modified date (newest first)
        const sortedPdfs = pdfList.sort((a, b) => 
          new Date(b.LastModified) - new Date(a.LastModified)
        );
        setPdfs(sortedPdfs);
        setError(null);
        
        // Generate thumbnails for each PDF
        for (const pdf of sortedPdfs) {
          generateThumbnail(pdf.Key);
        }
      } catch (err) {
        console.error('Failed to fetch PDFs:', err);
        setError('Failed to load PDFs. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPDFs();
  }, []);

  // Generate thumbnail for a PDF
  const generateThumbnail = async (pdfKey) => {
    try {
      const url = await getPDFUrl(pdfKey);
      
      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument(url);
      const pdf = await loadingTask.promise;
      
      // Get the first page
      const page = await pdf.getPage(1);
      
      // Set scale for thumbnail (smaller than full view)
      const viewport = page.getViewport({ scale: 0.2 });
      
      // Create canvas for thumbnail
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Render the PDF page to canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      
      // Convert canvas to data URL
      const thumbnailUrl = canvas.toDataURL();
      
      // Update thumbnails state
      setThumbnails(prev => ({
        ...prev,
        [pdfKey]: thumbnailUrl
      }));
    } catch (err) {
      console.error('Error generating thumbnail:', err);
      // Continue without thumbnail
    }
  };
  
  const handleSelectPDF = async (pdf) => {
    try {
      const url = await getPDFUrl(pdf.Key);
      onSelectPDF({
        name: pdf.Key,
        url: url,
        size: pdf.Size,
        lastModified: pdf.LastModified
      });
    } catch (err) {
      console.error('Error getting PDF URL:', err);
      setError('Failed to open PDF. Please try again.');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Paper elevation={2} sx={{ p: 3, bgcolor: '#fff4f4' }}>
        <Typography color="error">{error}</Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ maxHeight: '400px', overflow: 'auto', mb: 3 }}>
      <Typography variant="h6" sx={{ p: 2, borderBottom: '1px solid #eee' }}>
        Available PDFs
      </Typography>
      {pdfs.length === 0 ? (
        <Typography sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
          No PDFs found. Upload one to get started.
        </Typography>
      ) : (
        <List>
          {pdfs.map((pdf) => (
            <ListItem key={pdf.Key} divider>
              <ListItemButton onClick={() => handleSelectPDF(pdf)}>
                {thumbnails[pdf.Key] ? (
                  <Avatar 
                    src={thumbnails[pdf.Key]} 
                    variant="rounded" 
                    sx={{ width: 56, height: 56, mr: 2, bgcolor: '#f5f5f5' }}
                  />
                ) : (
                  <InsertDriveFile sx={{ mr: 2, color: '#f44336', fontSize: 40 }} />
                )}
                <ListItemText 
                  primary={pdf.Key} 
                  secondary={
                    `Size: ${(pdf.Size / 1024).toFixed(2)} KB • Last modified: ${new Date(pdf.LastModified).toLocaleDateString()}`
                  } 
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default PDFList;