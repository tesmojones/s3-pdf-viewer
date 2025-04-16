import { useState } from 'react'
import { Container, Typography, Box, CssBaseline, AppBar, Toolbar, Grid, useMediaQuery, useTheme } from '@mui/material'
import PDFList from './components/PDFList/PDFList'
import PDFViewer from './components/PDFViewer/PDFViewer'
import PDFUpload from './components/PDFUpload/PDFUpload'
import './App.css'

function App() {
  const [selectedPDF, setSelectedPDF] = useState(null);
  const [refreshList, setRefreshList] = useState(0);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const handleSelectPDF = (pdf) => {
    setSelectedPDF(pdf);
  };

  const handleUploadSuccess = () => {
    // Trigger a refresh of the PDF list
    setRefreshList(prev => prev + 1);
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
              overflow: 'hidden'
            }}
          >
            {/* Sidebar with PDF list and upload - narrower */}
            <Grid 
              item 
              xs={12} 
              md={2} 
              lg={1.5} 
              sx={{ 
                height: '100%',
                overflow: 'auto'
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
            
            {/* PDF Viewer - taking more available space */}
            <Grid 
              item 
              xs={12} 
              md={10} 
              lg={10.5} 
              sx={{ 
                height: '100%',
                overflow: 'hidden'
              }}
            >
              <Box sx={{ 
                height: '100%', 
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                overflow: 'hidden'
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
