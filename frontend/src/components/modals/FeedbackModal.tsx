import { useState, useRef } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  Chip,
  Card,
  CardContent,
  IconButton,
  LinearProgress,
  Stack,
  Divider
} from '@mui/material'
import {
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  Send as SendIcon
} from '@mui/icons-material'
import feedbackService from '../../services/feedback'
import type { CreateFeedbackData } from '../../services/feedback'

interface FeedbackModalProps {
  open: boolean
  onClose: () => void
  onSubmit?: () => void
}

const CATEGORIES = [
  { value: 'bug', label: '🐛 Bug Report', description: 'Something is broken or not working as expected' },
  { value: 'feature_request', label: '💡 Feature Request', description: 'Suggest a new feature or enhancement' },
  { value: 'improvement', label: '⚡ Improvement', description: 'Suggest ways to improve existing features' },
  { value: 'other', label: '💬 Other', description: 'General feedback or questions' }
]

const PRIORITIES = [
  { value: 'low', label: 'Low', color: '#4caf50' },
  { value: 'medium', label: 'Medium', color: '#ff9800' },
  { value: 'high', label: 'High', color: '#f44336' },
  { value: 'critical', label: 'Critical', color: '#9c27b0' }
]

export default function FeedbackModal({ open, onClose, onSubmit }: FeedbackModalProps) {
  const [formData, setFormData] = useState<CreateFeedbackData>({
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    images: []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Title and description are required')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await feedbackService.createFeedback(formData)
      setSuccess('Thank you for your feedback! We\'ll review it and get back to you soon.')
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: '',
        priority: 'medium',
        images: []
      })

      setTimeout(() => {
        setSuccess('')
        onSubmit?.()
        onClose()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return

    const newImages: File[] = []
    const maxSize = 5 * 1024 * 1024 // 5MB
    const maxFiles = 3

    for (let i = 0; i < Math.min(files.length, maxFiles); i++) {
      const file = files[i]
      
      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed')
        continue
      }

      if (file.size > maxSize) {
        setError('Image files must be smaller than 5MB')
        continue
      }

      newImages.push(file)
    }

    const currentImages = formData.images || []
    const totalImages = currentImages.length + newImages.length

    if (totalImages > maxFiles) {
      setError(`Maximum ${maxFiles} images allowed`)
      return
    }

    setFormData({
      ...formData,
      images: [...currentImages, ...newImages]
    })
    setError('')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const removeImage = (index: number) => {
    const newImages = [...(formData.images || [])]
    newImages.splice(index, 1)
    setFormData({ ...formData, images: newImages })
  }

  const selectedCategory = CATEGORIES.find(cat => cat.value === formData.category)
  const selectedPriority = PRIORITIES.find(pri => pri.value === formData.priority)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">Send Feedback</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Help us improve by sharing your thoughts, reporting bugs, or suggesting new features
        </Typography>
      </DialogTitle>

      <DialogContent>
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Category Selection */}
          <FormControl fullWidth>
            <InputLabel>Feedback Type</InputLabel>
            <Select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              label="Feedback Type"
            >
              {CATEGORIES.map((category) => (
                <MenuItem key={category.value} value={category.value}>
                  <Box>
                    <Typography variant="body1">{category.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {category.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Priority Selection */}
          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              label="Priority"
            >
              {PRIORITIES.map((priority) => (
                <MenuItem key={priority.value} value={priority.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: priority.color
                      }}
                    />
                    {priority.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Title */}
          <TextField
            fullWidth
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Brief summary of your feedback"
            required
          />

          {/* Description */}
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Please provide detailed information about your feedback, including steps to reproduce if it's a bug"
            required
          />

          {/* Image Upload */}
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Attachments (optional - max 3 images, 5MB each)
            </Typography>
            
            <Card
              sx={{
                border: 2,
                borderColor: dragActive ? 'primary.main' : 'grey.300',
                borderStyle: 'dashed',
                bgcolor: dragActive ? 'action.hover' : 'background.paper',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <CloudUploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body1">
                  Drop images here or click to browse
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  PNG, JPG, GIF up to 5MB each
                </Typography>
              </CardContent>
            </Card>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelect(e.target.files)}
            />

            {/* Preview uploaded images */}
            {formData.images && formData.images.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Attached Images:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {formData.images.map((image, index) => (
                    <Chip
                      key={index}
                      icon={<ImageIcon />}
                      label={image.name}
                      onDelete={() => removeImage(index)}
                      deleteIcon={<DeleteIcon />}
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Box>

          {/* Summary */}
          {(selectedCategory || selectedPriority) && (
            <>
              <Divider />
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Summary:
                </Typography>
                <Stack direction="row" spacing={1}>
                  {selectedCategory && (
                    <Chip
                      label={selectedCategory.label}
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                  )}
                  {selectedPriority && (
                    <Chip
                      label={`${selectedPriority.label} Priority`}
                      sx={{
                        bgcolor: selectedPriority.color + '20',
                        color: selectedPriority.color,
                        border: `1px solid ${selectedPriority.color}40`
                      }}
                      size="small"
                    />
                  )}
                </Stack>
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={<SendIcon />}
          disabled={loading || !formData.title.trim() || !formData.description.trim()}
        >
          {loading ? 'Sending...' : 'Send Feedback'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}