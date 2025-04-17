import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom';
import { Container, Typography, Box, CssBaseline, AppBar, Toolbar, Grid, useMediaQuery, useTheme, IconButton } from '@mui/material'
import { Menu as MenuIcon, ChevronLeft as ChevronLeftIcon } from '@mui/icons-material'; // Import icons
import PDFList from './components/PDFList/PDFList'
import PDFViewer from './components/PDFViewer/PDFViewer'
import PDFUpload from './components/PDFUpload/PDFUpload'
import './App.css'

function App() {
  const [selectedPDF, setSelectedPDF] = useState(null);
  const [refreshList, setRefreshList] = useState(0);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true); // State for sidebar visibility
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // On mount or URL change, check if the path matches a PDF
    const path = location.pathname;
    if (path && path !== '/' && path.endsWith('.pdf')) {
      // Try to auto-select the PDF if not already selected
      setSelectedPDF(prev => {
        if (prev && prev.name === path.slice(1)) return prev;
        // Otherwise, trigger PDFList to select this PDF
        return { name: path.slice(1) };
      });
    }
  }, [location.pathname]);

  const handleSelectPDF = (pdf) => {
    setSelectedPDF(pdf);
    if (pdf && pdf.name) {
      navigate(`/${pdf.name}`, { replace: false });
    } else {
      navigate(`/`, { replace: false });
    }
  };

  const handleUploadSuccess = () => {
    // Trigger a refresh of the PDF list
    setRefreshList(prev => prev + 1);
  };

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      overflow: 'hidden'
    }}>
      <CssBaseline />
      <AppBar position="static" color="primary">
        <Toolbar variant="dense">
          {/* Toggle Button */}
          <IconButton
            edge="start"
            color="inherit"
            aria-label="toggle sidebar"
            onClick={toggleSidebar}
            sx={{ mr: 1 }}
          >
            {isSidebarVisible ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            S3 PDF Viewer
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Container 
          maxWidth={false} 
          disableGutters 
          sx={{ 
            px: { xs: 1, sm: 2 },
            py: 1,
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <Grid 
            container 
            spacing={1} 
            sx={{ 
              flexGrow: 1,
              height: '100%',
              overflow: 'hidden',
              flexWrap: 'nowrap' // Prevent wrapping on smaller screens when sidebar is hidden
            }}
          >
            {/* Sidebar with PDF list and upload - conditionally rendered and sized */}
            {isSidebarVisible && (
              <Grid 
                item 
                xs={12} // Takes full width on small screens if shown
                md={3} 
                lg={2.5} 
                sx={{ 
                  height: '100%',
                  overflow: 'auto',
                  transition: 'width 0.3s ease-in-out, opacity 0.3s ease-in-out', // Smooth transition
                  width: isSidebarVisible ? { md: '25%', lg: '20.8333%' } : '0%', // Control width
                  opacity: isSidebarVisible ? 1 : 0, // Control visibility
                  display: { xs: isSidebarVisible ? 'block' : 'none', md: 'block' } // Hide on xs when toggled off
                }}
              >
                <Box sx={{ mb: 2 }}>
                  <PDFUpload onUploadSuccess={handleUploadSuccess} />
                </Box>
                <PDFList 
                  onSelectPDF={handleSelectPDF} 
                  key={`pdf-list-${refreshList}`} // Force re-render when refreshList changes
                />
              </Grid>
            )}
            {/* Modern vertical divider between sidebar and PDF viewer */}
            {isSidebarVisible && (
              <Grid item sx={{
                display: { xs: 'none', md: 'flex' },
                alignItems: 'stretch',
                px: 0,
                height: '100%',
                minWidth: '0px',
                zIndex: 2
              }}>
                <Box sx={{
                  width: '2.5px',
                  height: '100%',
                  background: 'linear-gradient(180deg, #e3eafc 0%, #cfd8dc 100%)',
                  boxShadow: '0 0 8px 0 rgba(33, 150, 243, 0.10)',
                  borderRadius: '8px',
                  marginY: 2,
                  transition: 'background 0.3s',
                }} />
              </Grid>
            )}
            {/* PDF Viewer - taking more available space */}
            <Grid 
              item 
              xs={12} // Always takes full width on small screens
              md={isSidebarVisible ? 9 : 12} // Adjust width based on sidebar visibility
              lg={isSidebarVisible ? 9.5 : 12} // Adjust width based on sidebar visibility
              sx={{ 
                height: '100%',
                overflow: 'hidden',
                transition: 'width 0.3s ease-in-out' // Smooth transition for width change
              }}
            >
              <Box sx={{ 
                height: '100%', 
                display: 'flex',
                flexDirection: 'column',
                width: '110%',
             
              }}>
                <PDFViewer pdfFile={selectedPDF} />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>
      
      <Box sx={{ 
        p: 1, 
        borderTop: '1px solid #eee', 
        textAlign: 'center',
        bgcolor: '#f9f9f9'
      }}>
        <Typography variant="body2" color="text.secondary">
          S3 PDF Viewer - View, bookmark, and upload PDFs to Amazon S3
        </Typography>
      </Box>
    </Box>
  )
}

export default App
