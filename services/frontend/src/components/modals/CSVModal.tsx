import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  Divider
} from '@mui/material'
import { 
  CloudUpload as CloudUploadIcon, 
  Download as DownloadIcon,
  Description as DescriptionIcon,
  Info as InfoIcon
} from '@mui/icons-material'
import { useTenant } from '../../contexts/useTenant'
import authService from '../../services/auth'

interface CSVModalProps {
  open: boolean
  onClose: () => void
  mode: 'import' | 'export'
  onComplete: () => void
}

type DataType = 'items' | 'users' | 'borrowings'

interface ValidationError {
  row: number
  field: string
  message: string
}

interface PreviewRow {
  _rowIndex: number
  [key: string]: string | number
}

export default function CSVModal({ open, onClose, mode, onComplete }: CSVModalProps) {
  const { currentInstance } = useTenant()
  const [dataType, setDataType] = useState<DataType>('items')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [loading, setLoading] = useState(false)

  // CSV Template configurations
  const csvTemplates = {
    items: {
      headers: ['name', 'description', 'categoryName', 'totalCount', 'availableCount'],
      requiredFields: ['name', 'categoryName', 'totalCount'],
      example: [
        ['Book Title 1', 'A great book about programming', 'Books', '5', '5'],
        ['Laptop Model X', 'High-performance laptop for development', 'Electronics', '3', '3'],
        ['Projector HD', 'Full HD projector for presentations', 'Equipment', '2', '2']
      ],
      guidelines: [
        'name: Item name (required)',
        'description: Item description (optional)',
        'categoryName: Category name - will create if not exists (required)',
        'totalCount: Total number of items (required, must be positive integer)',
        'availableCount: Currently available items (optional, defaults to totalCount)'
      ]
    },
    users: {
      headers: ['email', 'firstName', 'lastName', 'role', 'contactInfo'],
      requiredFields: ['email', 'firstName', 'lastName', 'role'],
      example: [
        ['john.doe@example.com', 'John', 'Doe', 'BORROWER', '+1234567890'],
        ['jane.smith@example.com', 'Jane', 'Smith', 'STAFF', '+0987654321'],
        ['admin@example.com', 'Admin', 'User', 'ADMIN', '+1122334455']
      ],
      guidelines: [
        'email: Valid email address (required, must be unique)',
        'firstName: User first name (required)',
        'lastName: User last name (required)',
        'role: User role - ADMIN, STAFF, or BORROWER (required)',
        'contactInfo: Phone number or other contact info (optional)'
      ]
    },
    borrowings: {
      headers: ['borrowerEmail', 'itemName', 'dueDate', 'notes'],
      requiredFields: ['borrowerEmail', 'itemName', 'dueDate'],
      example: [
        ['john.doe@example.com', 'Book Title 1', '2025-12-31', 'Please handle with care'],
        ['jane.smith@example.com', 'Laptop Model X', '2025-12-15', ''],
        ['user@example.com', 'Projector HD', '2025-12-20', 'For conference room presentation']
      ],
      guidelines: [
        'borrowerEmail: Email of existing user (required)',
        'itemName: Name of existing item (required)',
        'dueDate: Due date in YYYY-MM-DD format (required)',
        'notes: Additional notes (optional)'
      ]
    }
  }

  const downloadTemplate = () => {
    const template = csvTemplates[dataType]
    const csvContent = [
      template.headers.join(','),
      ...template.example.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${dataType}_template.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile)
    setErrors([])
    
    // Parse CSV for preview
    const text = await selectedFile.text()
    const lines = text.split('\n')
    const headers = lines[0].split(',').map(h => h.trim())
    
    const previewData = lines.slice(1, 6).map((line, index) => {
      const values = line.split(',').map(v => v.trim())
      const row: PreviewRow = { _rowIndex: index + 2 }
      headers.forEach((header, i) => {
        row[header] = values[i] || ''
      })
      return row
    })
    
    setPreview(previewData)
    
    // Basic validation
    const validationErrors: ValidationError[] = []
    
    if (dataType === 'items') {
      previewData.forEach(row => {
        if (!row.title) {
          validationErrors.push({
            row: row._rowIndex,
            field: 'title',
            message: 'Title is required'
          })
        }
        if (!row.category) {
          validationErrors.push({
            row: row._rowIndex,
            field: 'category',
            message: 'Category is required'
          })
        }
        if (row.totalCount && isNaN(parseInt(String(row.totalCount)))) {
          validationErrors.push({
            row: row._rowIndex,
            field: 'totalCount',
            message: 'Total count must be a number'
          })
        }
      })
    }
    
    setErrors(validationErrors)
  }

  const handleImport = async () => {
    if (!file || !currentInstance || errors.length > 0) return

    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', dataType)
    formData.append('instanceId', currentInstance.id.toString())

    try {
      const response = await fetch('/api/csv/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authService.getAccessToken()}`
        },
        body: formData
      })

      if (response.ok) {
        onComplete()
        onClose()
      } else {
        const error = await response.json()
        alert(`Import failed: ${error.message}`)
      }
    } catch (error) {
      console.error('Failed to import CSV:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    if (!currentInstance) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/csv/export?type=${dataType}&instanceId=${currentInstance.id}`,
        {
          headers: {
            'Authorization': `Bearer ${authService.getAccessToken()}`
          }
        }
      )

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${dataType}_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        onComplete()
        onClose()
      }
    } catch (error) {
      console.error('Failed to export CSV:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderPreviewTable = () => {
    if (preview.length === 0) return null

    const headers = Object.keys(preview[0]).filter(key => key !== '_rowIndex')

    return (
      <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Row</TableCell>
              {headers.map(header => (
                <TableCell key={header}>{header}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {preview.map((row) => (
              <TableRow key={row._rowIndex}>
                <TableCell>{row._rowIndex}</TableCell>
                {headers.map(header => (
                  <TableCell 
                    key={header}
                    sx={{
                      color: errors.some(e => 
                        e.row === row._rowIndex && e.field === header
                      ) ? 'error.main' : 'inherit'
                    }}
                  >
                    {row[header]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    )
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {mode === 'import' ? 'Import CSV' : 'Export CSV'}
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Data Type</InputLabel>
            <Select
              value={dataType}
              onChange={(e) => {
                setDataType(e.target.value as DataType)
                setFile(null)
                setPreview([])
                setErrors([])
              }}
              label="Data Type"
            >
              <MenuItem value="items">Items</MenuItem>
              <MenuItem value="users">Users</MenuItem>
              <MenuItem value="borrowings">Borrowings</MenuItem>
            </Select>
          </FormControl>

          {mode === 'import' && (
            <>
              {/* CSV Template Section */}
              <Paper sx={{ p: 2, bgcolor: 'info.light', color: 'info.contrastText' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <InfoIcon />
                  <Typography variant="h6">CSV Format Guidelines</Typography>
                </Box>
                
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Download a template CSV file with the correct format and example data:
                </Typography>
                
                <Button
                  startIcon={<DescriptionIcon />}
                  variant="contained"
                  color="primary"
                  onClick={downloadTemplate}
                  sx={{ mb: 2 }}
                >
                  Download {dataType.charAt(0).toUpperCase() + dataType.slice(1)} Template
                </Button>

                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Required Fields:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                  {csvTemplates[dataType].requiredFields.map(field => (
                    <Chip key={field} label={field} size="small" color="secondary" />
                  ))}
                </Box>

                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Field Descriptions:
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                  {csvTemplates[dataType].guidelines.map((guideline, index) => (
                    <Typography key={index} component="li" variant="caption" display="block">
                      {guideline}
                    </Typography>
                  ))}
                </Box>
              </Paper>

              <Divider sx={{ my: 2 }} />

              <Box
                sx={{
                  border: 2,
                  borderColor: 'grey.300',
                  borderStyle: 'dashed',
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                  bgcolor: 'background.paper',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'action.hover'
                  }
                }}
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = '.csv'
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0]
                    if (file) handleFileSelect(file)
                  }
                  input.click()
                }}
              >
                <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body1" color="text.secondary">
                  Click to upload CSV file
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Use the template above for correct formatting
                </Typography>
                {file && (
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    Selected: {file.name}
                  </Typography>
                )}
              </Box>

              {preview.length > 0 && (
                <>
                  <Typography variant="h6">Preview (first 5 rows)</Typography>
                  {renderPreviewTable()}
                </>
              )}

              {errors.length > 0 && (
                <Alert severity="error">
                  <Typography variant="subtitle2" gutterBottom>
                    Validation Errors:
                  </Typography>
                  {errors.slice(0, 5).map((error, index) => (
                    <Typography key={index} variant="caption" display="block">
                      Row {error.row}, {error.field}: {error.message}
                    </Typography>
                  ))}
                  {errors.length > 5 && (
                    <Typography variant="caption" display="block">
                      ... and {errors.length - 5} more errors
                    </Typography>
                  )}
                </Alert>
              )}

              <Alert severity="info">
                <Typography variant="subtitle2" gutterBottom>
                  CSV Format Guidelines:
                </Typography>
                <Typography variant="caption" display="block">
                  • First row must contain column headers
                </Typography>
                <Typography variant="caption" display="block">
                  • IDs are optional for new records, required for updates/deletes
                </Typography>
                <Typography variant="caption" display="block">
                  • Date format: YYYY-MM-DD
                </Typography>
              </Alert>
            </>
          )}

          {mode === 'export' && (
            <Alert severity="info">
              <Typography variant="body2">
                The exported CSV will include IDs for all records, which can be used for future updates or deletions.
              </Typography>
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        {mode === 'import' ? (
          <Button 
            onClick={handleImport} 
            variant="contained"
            disabled={loading || !file || errors.length > 0}
            startIcon={loading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
          >
            Import
          </Button>
        ) : (
          <Button 
            onClick={handleExport} 
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <DownloadIcon />}
          >
            Export
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}