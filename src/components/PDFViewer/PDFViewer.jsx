import { useState, useEffect, useRef } from 'react';
import { Paper, Box, Typography, Button, CircularProgress, Snackbar, Alert, IconButton } from '@mui/material';
import { BookmarkAdd, NavigateBefore, NavigateNext } from '@mui/icons-material';
import { saveBookmark, getBookmark } from '../../services/s3Service';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker - use local worker file instead of CDN
import 'pdfjs-dist/build/pdf.worker.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.mjs';

const PDFViewer = ({ pdfFile }) => {
  const canvasRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  // Load PDF when pdfFile changes
  useEffect(() => {
    if (!pdfFile?.url) return;
    
    setLoading(true);
    setError(null);
    
    const loadPDF = async () => {
      try {
        // Load the PDF document
        const loadingTask = pdfjsLib.getDocument(pdfFile.url);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setPageCount(pdf.numPages);
        
        // Get saved bookmark if exists
        const savedPage = getBookmark(pdfFile.name);
        setPageNum(savedPage);
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('Failed to load PDF. Please try again.');
        setLoading(false);
      }
    };
    
    loadPDF();
  }, [pdfFile]);
  
  // Render page when pageNum changes
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    
    const renderPage = async () => {
      try {
        // Get the page
        const page = await pdfDoc.getPage(pageNum);
        
        // Set scale for responsive rendering
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        // Set canvas dimensions to match the viewport
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Render the PDF page
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        await page.render(renderContext).promise;
      } catch (err) {
        console.error('Error rendering page:', err);
        setError('Failed to render page. Please try again.');
      }
    };
    
    renderPage();
  }, [pdfDoc, pageNum]);
  
  const handlePrevPage = () => {
    if (pageNum <= 1) return;
    setPageNum(pageNum - 1);
  };
  
  const handleNextPage = () => {
    if (pageNum >= pageCount) return;
    setPageNum(pageNum + 1);
  };
  
  const handleSaveBookmark = async () => {
    try {
      await saveBookmark(pdfFile.name, pageNum);
      setNotification({
        open: true,
        message: `Bookmark saved at page ${pageNum}`,
        severity: 'success'
      });
    } catch (err) {
      setNotification({
        open: true,
        message: 'Failed to save bookmark',
        severity: 'error'
      });
    }
  };
  
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };
  
  if (!pdfFile) {
    return (
      <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Select a PDF from the list to view
        </Typography>
      </Paper>
    );
  }
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
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
    <Paper elevation={3} sx={{ p: 2 }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          {pdfFile.name}
        </Typography>
        <Box>
          <IconButton onClick={handleSaveBookmark} title="Save bookmark at current page">
            <BookmarkAdd />
          </IconButton>
        </Box>
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <Box sx={{ border: '1px solid #eee', maxWidth: '100%', overflow: 'auto' }}>
          <canvas ref={canvasRef} style={{ display: 'block' }} />
        </Box>
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
        <Button 
          variant="outlined" 
          startIcon={<NavigateBefore />} 
          onClick={handlePrevPage} 
          disabled={pageNum <= 1}
        >
          Previous
        </Button>
        <Typography>
          Page {pageNum} of {pageCount}
        </Typography>
        <Button 
          variant="outlined" 
          endIcon={<NavigateNext />} 
          onClick={handleNextPage} 
          disabled={pageNum >= pageCount}
        >
          Next
        </Button>
      </Box>
      
      <Snackbar 
        open={notification.open} 
        autoHideDuration={3000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default PDFViewer;