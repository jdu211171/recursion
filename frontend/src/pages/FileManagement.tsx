import { useState, useEffect } from 'react'
import {
  Container,
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Alert,
  Checkbox,
  Toolbar,
  Tooltip,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material'
import {
  Search as SearchIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Description as DocumentIcon,
  InsertDriveFile as FileIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Preview as PreviewIcon
} from '@mui/icons-material'
import { useTenant } from '../contexts/useTenant'
import filesService from '../services/files'

interface FileRecord {
  id: string
  originalName: string
  fileName: string
  mimeType: string
  size: number
  uploadedBy: string
  uploadedByUser?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  itemId?: string
  item?: {
    id: string
    name: string
  }
  createdAt: string
}

interface FileFilters {
  search: string
  uploadedBy: string
  itemId: string
  mimeType: string
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <ImageIcon />
  if (mimeType === 'application/pdf') return <PdfIcon />
  if (mimeType.startsWith('text/') || 
      mimeType.includes('word') || 
      mimeType.includes('document')) return <DocumentIcon />
  return <FileIcon />
}

const getMimeTypeColor = (mimeType: string): 'primary' | 'secondary' | 'success' | 'warning' => {
  if (mimeType.startsWith('image/')) return 'success'
  if (mimeType === 'application/pdf') return 'secondary'
  if (mimeType.startsWith('text/')) return 'primary'
  return 'warning'
}

export default function FileManagement() {
  const { currentInstance } = useTenant()
  const [files, setFiles] = useState<FileRecord[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [filters, setFilters] = useState<FileFilters>({
    search: '',
    uploadedBy: '',
    itemId: '',
    mimeType: ''
  })
  const [selected, setSelected] = useState<string[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<FileRecord | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const fetchFiles = async () => {
    if (!currentInstance) return

    setLoading(true)
    setError('')

    try {
      const response = await filesService.getFiles({
        page: page + 1,
        limit: rowsPerPage,
        itemId: filters.itemId || undefined,
        uploadedBy: filters.uploadedBy || undefined
      })

      // Filter by search term and mime type locally
      let filteredFiles = response.files
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filteredFiles = filteredFiles.filter(file => 
          file.originalName.toLowerCase().includes(searchLower) ||
          file.item?.name.toLowerCase().includes(searchLower) ||
          file.uploadedByUser?.email.toLowerCase().includes(searchLower)
        )
      }
      if (filters.mimeType) {
        filteredFiles = filteredFiles.filter(file => 
          file.mimeType.includes(filters.mimeType)
        )
      }

      setFiles(filteredFiles)
      setTotalCount(response.pagination.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch files')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [currentInstance, page, rowsPerPage])

  const handleSearch = () => {
    setPage(0)
    fetchFiles()
  }

  const handleClearFilters = () => {
    setFilters({
      search: '',
      uploadedBy: '',
      itemId: '',
      mimeType: ''
    })
    setPage(0)
    fetchFiles()
  }

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelected(files.map(file => file.id))
    } else {
      setSelected([])
    }
  }

  const handleSelectOne = (fileId: string) => {
    const selectedIndex = selected.indexOf(fileId)
    let newSelected: string[] = []

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, fileId)
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1))
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1))
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      )
    }

    setSelected(newSelected)
  }

  const handleDeleteClick = (file: FileRecord) => {
    setFileToDelete(file)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return

    try {
      await filesService.deleteFile(fileToDelete.id)
      fetchFiles()
      setDeleteDialogOpen(false)
      setFileToDelete(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file')
    }
  }

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selected.map(id => filesService.deleteFile(id)))
      setSelected([])
      setBulkDeleteDialogOpen(false)
      fetchFiles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete files')
    }
  }

  const handleDownload = async (file: FileRecord) => {
    try {
      const downloadInfo = await filesService.getDownloadUrl(file.id)
      window.open(downloadInfo.url, '_blank')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get download URL')
    }
  }

  const handlePreview = async (file: FileRecord) => {
    if (!file.mimeType.startsWith('image/')) return

    try {
      const downloadInfo = await filesService.getDownloadUrl(file.id)
      setPreviewUrl(downloadInfo.url)
      setPreviewFile(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get preview URL')
    }
  }

  if (!currentInstance) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="warning">Please select an instance to manage files</Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          File Management
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={fetchFiles}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by filename, item, or uploader..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>File Type</InputLabel>
              <Select
                value={filters.mimeType}
                label="File Type"
                onChange={(e) => setFilters({ ...filters, mimeType: e.target.value })}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="image">Images</MenuItem>
                <MenuItem value="pdf">PDFs</MenuItem>
                <MenuItem value="text">Text Files</MenuItem>
                <MenuItem value="application">Documents</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Item ID"
              value={filters.itemId}
              onChange={(e) => setFilters({ ...filters, itemId: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleSearch}
                disabled={loading}
              >
                Search
              </Button>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleClearFilters}
                startIcon={<ClearIcon />}
              >
                Clear
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {selected.length > 0 && (
        <Toolbar sx={{ pl: { sm: 2 }, pr: { xs: 1, sm: 1 }, bgcolor: 'action.selected', mb: 2 }}>
          <Typography
            sx={{ flex: '1 1 100%' }}
            color="inherit"
            variant="subtitle1"
            component="div"
          >
            {selected.length} selected
          </Typography>
          <Tooltip title="Delete">
            <IconButton onClick={() => setBulkDeleteDialogOpen(true)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selected.length > 0 && selected.length < files.length}
                  checked={files.length > 0 && selected.length === files.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>File</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Item</TableCell>
              <TableCell>Uploaded By</TableCell>
              <TableCell>Upload Date</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : files.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No files found
                </TableCell>
              </TableRow>
            ) : (
              files.map((file) => (
                <TableRow
                  key={file.id}
                  hover
                  selected={selected.indexOf(file.id) !== -1}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selected.indexOf(file.id) !== -1}
                      onChange={() => handleSelectOne(file.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ bgcolor: 'action.selected' }}>
                        {getFileIcon(file.mimeType)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2">
                          {file.originalName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {file.fileName}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={file.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
                      size="small"
                      color={getMimeTypeColor(file.mimeType)}
                    />
                  </TableCell>
                  <TableCell>{formatFileSize(file.size)}</TableCell>
                  <TableCell>
                    {file.item ? (
                      <Box>
                        <Typography variant="body2">
                          {file.item.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {file.itemId}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No item
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {file.uploadedByUser ? (
                      <Box>
                        <Typography variant="body2">
                          {file.uploadedByUser.firstName} {file.uploadedByUser.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {file.uploadedByUser.email}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Unknown
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(file.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      {file.mimeType.startsWith('image/') && (
                        <Tooltip title="Preview">
                          <IconButton
                            size="small"
                            onClick={() => handlePreview(file)}
                          >
                            <PreviewIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Download">
                        <IconButton
                          size="small"
                          onClick={() => handleDownload(file)}
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(file)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10))
            setPage(0)
          }}
        />
      </TableContainer>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete File</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{fileToDelete?.originalName}"? 
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onClose={() => setBulkDeleteDialogOpen(false)}>
        <DialogTitle>Delete Multiple Files</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete {selected.length} files? 
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleBulkDelete} color="error" variant="contained">
            Delete All
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={!!previewFile}
        onClose={() => {
          setPreviewFile(null)
          setPreviewUrl(null)
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{previewFile?.originalName}</DialogTitle>
        <DialogContent>
          {previewUrl && (
            <Box sx={{ textAlign: 'center' }}>
              <img
                src={previewUrl}
                alt={previewFile?.originalName}
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setPreviewFile(null)
            setPreviewUrl(null)
          }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}