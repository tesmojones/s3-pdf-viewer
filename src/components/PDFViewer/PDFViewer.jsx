import { useState, useEffect, useRef } from 'react';
import { 
  Paper, Box, Typography, Button, CircularProgress, Snackbar, Alert, 
  IconButton, useTheme, useMediaQuery, Tooltip, Fade, Divider, Slider
} from '@mui/material';
import { 
  BookmarkAdd, NavigateBefore, NavigateNext, Keyboard, 
  ZoomIn, ZoomOut, FullscreenRounded, FullscreenExitRounded,
  ArrowBackIosNewRounded, ArrowForwardIosRounded
} from '@mui/icons-material';
import { saveBookmark, getBookmark } from '../../services/s3Service';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker - use local worker file instead of CDN
import 'pdfjs-dist/build/pdf.worker.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.mjs';

const PDFViewer = ({ pdfFile }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [scale, setScale] = useState(1.5);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // Load PDF when pdfFile changes
  useEffect(() => {
    if (!pdfFile?.url) return;
    
    let loadingTask = null;
    let isMounted = true;
    
    // Reset state
    setLoading(true);
    setError(null);
    setPdfDoc(null);
    setPageCount(0);
    setPageNum(1);
    setScale(1.5);
    setZoomLevel(100);
    
    const loadPDF = async () => {
      let retries = 0;
      const maxRetries = 10;
      const retryDelay = 500;
      while (retries < maxRetries) {
        try {
          // Cancel any previous loading task
          if (loadingTask) {
            loadingTask.destroy();
          }
          // Always decode the PDF URL before passing to pdfjsLib.getDocument
          let pdfUrl;
          try {
            pdfUrl = decodeURIComponent(pdfFile.url);
          } catch (e) {
            pdfUrl = pdfFile.url;
          }
          loadingTask = pdfjsLib.getDocument({
            url: pdfUrl,
            cMapUrl: '/node_modules/pdfjs-dist/cmaps/',
            cMapPacked: true
          });
          // Add progress callback
          loadingTask.onProgress = (progress) => {
            // You could add a progress indicator here if needed
            // console.log(`Loading: ${Math.round(progress.loaded / progress.total * 100)}%`);
          };
          const pdf = await loadingTask.promise;
          // Check if component is still mounted
          if (!isMounted) return;
          setPdfDoc(pdf);
          setPageCount(pdf.numPages);
          // Get saved bookmark if exists
          const savedPage = getBookmark(pdfFile.name);
          if (savedPage && savedPage > 0 && savedPage <= pdf.numPages) {
            setPageNum(savedPage);
          } else {
            setPageNum(1);
          }
          setLoading(false);
          return;
        } catch (err) {
          retries++;
          if (retries >= maxRetries) {
            if (isMounted) {
              console.error('Error loading PDF:', err);
              setError('Failed to load PDF. Please check if the file is valid or try again later.');
              setLoading(false);
            }
            return;
          }
          await new Promise(res => setTimeout(res, retryDelay));
        }
      }
    };
    
    loadPDF();
    
    return () => {
      isMounted = false;
      // Clean up loading task
      if (loadingTask) {
        loadingTask.destroy();
      }
    };
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
    if (!pdfDoc) return;
    let cancelled = false;
    const updateScale = async () => {
      try {
        if (!containerRef.current) {
          setTimeout(updateScale, 100);
          return;
        }
        // Check if pdfDoc is still valid (not destroyed)
        if (!pdfDoc || typeof pdfDoc.getPage !== "function" || pdfDoc.destroyed || !pdfDoc._pdfInfo) {
          return;
        }
        const page = await pdfDoc.getPage(1);
        if (cancelled) return;
        const viewport = page.getViewport({ scale: 1.0 });
        const pdfContainer = containerRef.current.querySelector('[role="presentation"]') || containerRef.current;
        const containerWidth = Math.min(pdfContainer.clientWidth - 40, 800);
        const newScale = containerWidth / viewport.width * 0.98;
        if (Math.abs(scale - newScale) > 0.05 || scale === 1.5) {
          setScale(newScale);
          setZoomLevel(100);
        }
      } catch (err) {
        console.error('Error calculating scale:', err);
        if (containerRef.current) {
          setTimeout(updateScale, 200);
        }
      }
    };
    const timer = setTimeout(() => {
      updateScale();
    }, 300);
    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (containerRef.current) {
          updateScale();
        }
      }, 200);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
      clearTimeout(resizeTimer);
    };
  }, [pdfDoc]);
  
  // Render page when pageNum or scale changes
  useEffect(() => {
    if (!pdfDoc) return;
    let renderTask = null;
    let isMounted = true;
    const renderPage = async () => {
      try {
        // Check if canvas is available
        if (!canvasRef.current) {
          if (isMounted) {
            setTimeout(renderPage, 50);
          }
          return;
        }
        // Check if pdfDoc is still valid (not destroyed)
        if (!pdfDoc || typeof pdfDoc.getPage !== "function" || pdfDoc.destroyed || !pdfDoc._pdfInfo) {
          return;
        }
        setPageLoading(true);
        // Get the page
        const page = await pdfDoc.getPage(pageNum);
        // Set scale for responsive rendering
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        // If canvas is no longer available (component unmounted), abort
        if (!canvas || !isMounted) return;
        const context = canvas.getContext('2d');
        // Clear previous content
        context.clearRect(0, 0, canvas.width, canvas.height);
        // Set canvas dimensions to match the viewport
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        // Render the PDF page
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        // Cancel any ongoing render task
        if (renderTask) {
          renderTask.cancel();
        }
        // Start new render task
        renderTask = page.render(renderContext);
        await renderTask.promise;
        if (isMounted) {
          setPageLoading(false);
        }
      } catch (err) {
        // Only handle errors if not cancelled
        if (err && err.name !== 'RenderingCancelledException' && isMounted) {
          console.error('Error rendering page:', err);
          setError('Failed to render page. Please try again.');
          setPageLoading(false);
        }
      }
    };
    // Add a small delay to ensure we don't have multiple render operations in quick succession
    const timer = setTimeout(() => {
      renderPage();
    }, 50);
    return () => {
      isMounted = false;
      clearTimeout(timer);
      // Cancel any ongoing render task when component updates or unmounts
      if (renderTask) {
        renderTask.cancel();
      }
    };
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
  
  // Handle zoom controls
  const handleZoomIn = () => {
    const newZoom = Math.min(zoomLevel + 10, 200);
    setZoomLevel(newZoom);
    // Calculate new scale based on base scale (when zoomLevel was 100)
    const baseScale = scale * (100 / zoomLevel);
    setScale(baseScale * (newZoom / 100));
  };
  
  const handleZoomOut = () => {
    const newZoom = Math.max(zoomLevel - 10, 50);
    setZoomLevel(newZoom);
    // Calculate new scale based on base scale (when zoomLevel was 100)
    const baseScale = scale * (100 / zoomLevel);
    setScale(baseScale * (newZoom / 100));
  };
  
  const handleZoomChange = (event, newValue) => {
    // Calculate new scale based on base scale (when zoomLevel was 100)
    const baseScale = scale * (100 / zoomLevel);
    setZoomLevel(newValue);
    setScale(baseScale * (newValue / 100));
  };
  
  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (viewerRef.current.requestFullscreen) {
        viewerRef.current.requestFullscreen();
      } else if (viewerRef.current.webkitRequestFullscreen) {
        viewerRef.current.webkitRequestFullscreen();
      } else if (viewerRef.current.msRequestFullscreen) {
        viewerRef.current.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };
  
  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        document.fullscreenElement || 
        document.webkitFullscreenElement || 
        document.msFullscreenElement
      );
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  // We're keeping navigation buttons always visible now
  // No need for mouse enter/leave handlers
  
  if (!pdfFile) {
    return (
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          textAlign: 'center',
          borderRadius: 2,
          background: 'linear-gradient(145deg, #f0f0f0, #ffffff)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 2
        }}
      >
        <Box 
          sx={{ 
            width: 80, 
            height: 80, 
            borderRadius: '50%', 
            bgcolor: 'rgba(25, 118, 210, 0.08)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            mb: 2
          }}
        >
          <Typography 
            variant="h4" 
            sx={{ 
              color: 'primary.main', 
              fontWeight: 'light'
            }}
          >
            PDF
          </Typography>
        </Box>
        <Typography 
          variant="h6" 
          sx={{ 
            color: 'text.secondary',
            fontWeight: 'medium',
            letterSpacing: 0.5
          }}
        >
          Select a PDF from the list to view
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ maxWidth: '80%', mt: 1, opacity: 0.7 }}
        >
          Your document will appear here for viewing and navigation
        </Typography>
      </Paper>
    );
  }
  
  if (loading) {
    return (
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '400px',
          borderRadius: 2,
          background: 'linear-gradient(145deg, #f0f0f0, #ffffff)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
        }}
      >
        <CircularProgress size={48} thickness={4} />
        <Typography 
          variant="body1" 
          sx={{ mt: 3, color: 'text.secondary', fontWeight: 'medium' }}
        >
          Loading document...
        </Typography>
      </Paper>
    );
  }
  
  if (error) {
    return (
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          bgcolor: 'rgba(211, 47, 47, 0.04)', 
          borderRadius: 2,
          border: '1px solid rgba(211, 47, 47, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box 
            sx={{ 
              width: 40, 
              height: 40, 
              borderRadius: '50%', 
              bgcolor: 'rgba(211, 47, 47, 0.1)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              mr: 2
            }}
          >
            <Typography variant="h6" sx={{ color: 'error.main' }}>!</Typography>
          </Box>
          <Typography variant="h6" color="error.main" fontWeight="medium">
            Error Loading Document
          </Typography>
        </Box>
        <Typography color="error" variant="body1" sx={{ ml: 7 }}>
          {error}
        </Typography>
      </Paper>
    );
  }
  
  return (
    <Paper 
      elevation={2} 
      sx={{ 
        height: '100%', 
        width: '1000px',
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 2,
        background: '#ffffff',
        boxShadow: isFullscreen ? 'none' : '0 4px 20px rgba(0, 0, 0, 0.08)',
        transition: 'all 0.3s ease',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, #1976d2, #42a5f5)',
          borderTopLeftRadius: '8px',
          borderTopRightRadius: '8px',
        }
      }} 
      ref={containerRef}
    >
      {/* Header with document title and controls */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          p: 2,
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
          <Box 
            sx={{ 
              width: 36, 
              height: 36, 
              borderRadius: '8px', 
              bgcolor: 'primary.main', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              mr: 2,
              color: 'white',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            PDF
          </Box>
          <Typography 
            variant="h6" 
            noWrap 
            sx={{ 
              maxWidth: { xs: '180px', sm: '300px', md: '500px' }, 
              overflow: 'hidden', 
              textOverflow: 'ellipsis',
              fontWeight: 500,
              color: 'text.primary',
              letterSpacing: '0.3px'
            }}
          >
            {pdfFile.name.replace(/\.pdf$/i, '')}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Use keyboard arrows to navigate: ← → or Page Up/Down. Home/End for first/last page">
            <IconButton size="small" color="primary">
              <Keyboard fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Save bookmark at current page">
            <IconButton onClick={handleSaveBookmark} color="primary">
              <BookmarkAdd />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
            <IconButton onClick={toggleFullscreen} color="primary">
              {isFullscreen ? <FullscreenExitRounded /> : <FullscreenRounded />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Main content area - takes all available space */}
      <Box 
        ref={viewerRef}
        sx={{ 
          position: 'relative', 
          width: '100%', 
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          bgcolor: '#f8f8f8',
        }}
      >
        {/* Navigation buttons positioned on sides - always visible */}
        <Box 
          sx={{ 
            position: 'absolute', 
            left: { xs: 8, md: 16 }, 
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
              bgcolor: 'rgba(255, 255, 255, 0.9)', 
              '&:hover': { 
                bgcolor: 'primary.main',
                color: 'white'
              },
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              width: { xs: 40, md: 48 },
              height: { xs: 40, md: 48 },
              transition: 'all 0.2s ease',
              opacity: 0.9,
              '&.Mui-disabled': {
                bgcolor: 'rgba(255, 255, 255, 0.5)',
                color: 'rgba(0, 0, 0, 0.26)',
                opacity: 0.7
              }
            }}
            size={isMobile ? "small" : "medium"}
          >
            <ArrowBackIosNewRounded fontSize={isMobile ? "small" : "medium"} />
          </IconButton>
        </Box>
        
        <Box 
          sx={{ 
            position: 'absolute', 
            right: { xs: 8, md: 16 }, 
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
              bgcolor: 'rgba(255, 255, 255, 0.9)', 
              '&:hover': { 
                bgcolor: 'primary.main',
                color: 'white'
              },
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              width: { xs: 40, md: 48 },
              height: { xs: 40, md: 48 },
              transition: 'all 0.2s ease',
              opacity: 0.9,
              '&.Mui-disabled': {
                bgcolor: 'rgba(255, 255, 255, 0.5)',
                color: 'rgba(0, 0, 0, 0.26)',
                opacity: 0.7
              }
            }}
            size={isMobile ? "small" : "medium"}
          >
            <ArrowForwardIosRounded fontSize={isMobile ? "small" : "medium"} />
          </IconButton>
        </Box>
        
        {/* PDF Canvas Container - Fixed width with auto height */}
        <Box 
          sx={{ 
            width: '100%',
            display: 'flex', 
            justifyContent: 'center',
            borderRadius: 0,
            overflowX: 'hidden',
            overflowY: 'auto',
            position: 'relative',
            flexGrow: 1,
            p: 2,
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgba(0, 0, 0, 0.03)',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0, 0, 0, 0.15)',
              borderRadius: '8px',
              border: '2px solid transparent',
              backgroundClip: 'content-box',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
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
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(4px)',
                zIndex: 5
              }}
            >
              <CircularProgress size={40} thickness={4} />
            </Box>
          )}
          <Box 
            sx={{ 
              padding: '16px', 
              width: '100%', 
              textAlign: 'center',
              maxWidth: '850px',
              margin: '0 auto'
            }}
          >
            <canvas 
              ref={canvasRef} 
              style={{ 
                display: 'inline-block',
                maxWidth: '100%',
                width: 'auto',
                height: 'auto',
                borderRadius: '2px'
              }} 
            />
          </Box>
        </Box>
      </Box>
      
      {/* Page indicator and controls footer */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          p: 1,
          borderTop: '1px solid rgba(0, 0, 0, 0.06)',
        }}
      >
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            background: 'rgba(0, 0, 0, 0.03)',
            borderRadius: 2,
            px: 1.5,
            py: 0.5,
            minWidth: '120px',
            justifyContent: 'center'
          }}
        >
          <IconButton 
            size="small" 
            onClick={handlePrevPage} 
            disabled={pageNum <= 1}
            sx={{ 
              mr: 0.5,
              '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.06)' },
            }}
          >
            <NavigateBefore fontSize="small" />
          </IconButton>
          
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 'medium',
              userSelect: 'none',
              color: 'text.primary',
              minWidth: '40px',
              textAlign: 'center'
            }}
          >
            {pageNum} / {pageCount}
          </Typography>
          
          <IconButton 
            size="small" 
            onClick={handleNextPage} 
            disabled={pageNum >= pageCount}
            sx={{ 
              ml: 0.5,
              '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.06)' },
            }}
          >
            <NavigateNext fontSize="small" />
          </IconButton>
        </Box>
      </Box>
      
      <Snackbar 
        open={notification.open} 
        autoHideDuration={3000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          variant="filled"
          sx={{ 
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default PDFViewer;