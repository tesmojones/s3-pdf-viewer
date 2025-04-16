import { useState, useEffect } from 'react';
import { listPDFs, getPDFUrl } from '../../services/s3Service';
import { List, ListItem, ListItemText, ListItemButton, Typography, Paper, Box, CircularProgress } from '@mui/material';
import { InsertDriveFile } from '@mui/icons-material';

const PDFList = ({ onSelectPDF }) => {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      } catch (err) {
        console.error('Failed to fetch PDFs:', err);
        setError('Failed to load PDFs. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPDFs();
  }, []);

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
                <InsertDriveFile sx={{ mr: 2, color: '#f44336' }} />
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