import { useState } from 'react'
import { Container, Typography, Box, CssBaseline, AppBar, Toolbar, Grid } from '@mui/material'
import PDFList from './components/PDFList/PDFList'
import PDFViewer from './components/PDFViewer/PDFViewer'
import PDFUpload from './components/PDFUpload/PDFUpload'
import './App.css'

function App() {
  const [selectedPDF, setSelectedPDF] = useState(null);
  const [refreshList, setRefreshList] = useState(0);

  const handleSelectPDF = (pdf) => {
    setSelectedPDF(pdf);
  };

  const handleUploadSuccess = () => {
    // Trigger a refresh of the PDF list
    setRefreshList(prev => prev + 1);
  };

  return (
    <>
      <CssBaseline />
      <AppBar position="static" color="primary" sx={{ mb: 4 }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            S3 PDF Viewer
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg">
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Box sx={{ mb: 3 }}>
              <PDFUpload onUploadSuccess={handleUploadSuccess} />
            </Box>
            <PDFList 
              onSelectPDF={handleSelectPDF} 
              key={`pdf-list-${refreshList}`} // Force re-render when refreshList changes
            />
          </Grid>
          
          <Grid item xs={12} md={8}>
            <PDFViewer pdfFile={selectedPDF} />
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid #eee', textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            S3 PDF Viewer - View, bookmark, and upload PDFs to Amazon S3
          </Typography>
        </Box>
      </Container>
    </>
  )
}

export default App
