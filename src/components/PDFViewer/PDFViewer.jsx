import { useState, useEffect, useRef } from 'react';
import { Paper, Box, Typography, Button, CircularProgress, Snackbar, Alert, IconButton, useTheme, useMediaQuery, Tooltip } from '@mui/material';
import { BookmarkAdd, NavigateBefore, NavigateNext, Keyboard } from '@mui/icons-material';
import { saveBookmark, getBookmark } from '../../services/s3Service';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker - use local worker file instead of CDN
import 'pdfjs-dist/build/pdf.worker.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.mjs';

const PDFViewer = ({ pdfFile }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [scale, setScale] = useState(1.5);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
  
  // Add keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!pdfDoc) return;
      
      // Prevent default behavior for arrow keys to avoid scrolling the page
      if (['ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
      }
      
      // Left arrow or Page Up for previous page
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        handlePrevPage();
      }
      // Right arrow or Page Down for next page
      else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        handleNextPage();
      }
      // Home key for first page
      else if (e.key === 'Home') {
        setPageNum(1);
      }
      // End key for last page
      else if (e.key === 'End') {
        setPageNum(pageCount);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pdfDoc, pageNum, pageCount]);
  
  // Calculate appropriate scale based on container width
  useEffect(() => {
    if (!containerRef.current || !pdfDoc) return;
    
    const updateScale = async () => {
      try {
        const page = await pdfDoc.getPage(1); // Always use first page for consistent scaling
        const viewport = page.getViewport({ scale: 1.0 });
        
        // Get container width (accounting for padding)
        const pdfContainer = containerRef.current.querySelector('[role="presentation"]') || containerRef.current;
        const containerWidth = pdfContainer.clientWidth - 20; // 10px padding on each side
        
        // Calculate scale to fit width
        const newScale = containerWidth / viewport.width * 0.98; // 98% to add a small margin
        
        // Only update scale if it's significantly different or on first load
        if (Math.abs(scale - newScale) > 0.05 || scale === 1.5) {
          setScale(newScale);
        }
      } catch (err) {
        console.error('Error calculating scale:', err);
      }
    };
    
    // Small delay to ensure container is properly sized
    const timer = setTimeout(() => {
      updateScale();
    }, 100);
    
    // Add resize listener
    const handleResize = () => {
      updateScale();
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [pdfDoc, containerRef, scale]); // Remove pageNum dependency
  
  // Render page when pageNum or scale changes
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    
    const renderPage = async () => {
      try {
        setPageLoading(true);
        
        // Get the page
        const page = await pdfDoc.getPage(pageNum);
        
        // Set scale for responsive rendering
        const viewport = page.getViewport({ scale });
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
        setPageLoading(false);
      } catch (err) {
        console.error('Error rendering page:', err);
        setError('Failed to render page. Please try again.');
        setPageLoading(false);
      }
    };
    
    renderPage();
  }, [pdfDoc, pageNum, scale]);
  
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
    <Paper elevation={3} sx={{ 
      p: 1, 
      height: '100%', 
      width: '100%',
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }} ref={containerRef}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" noWrap sx={{ maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {pdfFile.name.replace(/\.pdf$/i, '').replace(/\.pdf$/i, '')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title="Use keyboard arrows to navigate: ← → or Page Up/Down. Home/End for first/last page">
            <IconButton size="small" sx={{ mr: 1 }}>
              <Keyboard fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Save bookmark at current page">
            <IconButton onClick={handleSaveBookmark}>
              <BookmarkAdd />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Main content area - takes all available space */}
      <Box sx={{ 
        position: 'relative', 
        width: '100%', 
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Navigation buttons positioned on sides */}
        <Box 
          sx={{ 
            position: 'absolute', 
            left: 5, 
            top: '50%', 
            transform: 'translateY(-50%)', 
            zIndex: 10 
          }}
        >
          <IconButton 
            onClick={handlePrevPage} 
            disabled={pageNum <= 1}
            className="pdf-nav-button"
            sx={{ 
              bgcolor: 'rgba(255, 255, 255, 0.7)', 
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.9)' },
              boxShadow: 2
            }}
            size={isMobile ? "small" : "medium"}
          >
            <NavigateBefore />
          </IconButton>
        </Box>
        
        <Box 
          sx={{ 
            position: 'absolute', 
            right: 5, 
            top: '50%', 
            transform: 'translateY(-50%)', 
            zIndex: 10 
          }}
        >
          <IconButton 
            onClick={handleNextPage} 
            disabled={pageNum >= pageCount}
            className="pdf-nav-button"
            sx={{ 
              bgcolor: 'rgba(255, 255, 255, 0.7)', 
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.9)' },
              boxShadow: 2
            }}
            size={isMobile ? "small" : "medium"}
          >
            <NavigateNext />
          </IconButton>
        </Box>
        
        {/* PDF Canvas Container - Full Width with auto height */}
        <Box 
          sx={{ 
            width: '100%',
            display: 'flex', 
            justifyContent: 'center',
            border: '1px solid #eee',
            borderRadius: 1,
            overflowX: 'hidden',
            overflowY: 'auto',
            position: 'relative',
            flexGrow: 1,
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: '4px',
            },
          }}
        >
          {pageLoading && (
            <Box 
              sx={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                zIndex: 5
              }}
            >
              <CircularProgress size={40} />
            </Box>
          )}
          <Box sx={{ padding: '10px 0', width: '100%', textAlign: 'center' }}>
            <canvas 
              ref={canvasRef} 
              style={{ 
                display: 'inline-block',
                maxWidth: '100%',
                width: 'auto',
                height: 'auto'
              }} 
            />
          </Box>
        </Box>
      </Box>
      
      {/* Page indicator */}
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 1 }}>
        <Typography variant="body2">
          Page {pageNum} of {pageCount}
        </Typography>
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