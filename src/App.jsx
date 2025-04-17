import { useState } from 'react'
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

  const handleSelectPDF = (pdf) => {
    setSelectedPDF(pdf);
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
                md={2} 
                lg={1.5} 
                sx={{ 
                  height: '100%',
                  overflow: 'auto',
                  transition: 'width 0.3s ease-in-out, opacity 0.3s ease-in-out', // Smooth transition
                  width: isSidebarVisible ? { md: '16.6667%', lg: '12.5%' } : '0%', // Control width
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
            
            {/* PDF Viewer - taking more available space */}
            <Grid 
              item 
              xs={12} // Always takes full width on small screens
              md={isSidebarVisible ? 10 : 12} // Adjust width based on sidebar visibility
              lg={isSidebarVisible ? 10.5 : 12} // Adjust width based on sidebar visibility
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
