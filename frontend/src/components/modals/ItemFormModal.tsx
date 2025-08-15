import { useState, useEffect, useCallback } from 'react'
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
  IconButton,
  Autocomplete,
  Switch,
  FormControlLabel,
  Divider
} from '@mui/material'
import { Close as CloseIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material'
import { useTenant } from '../../contexts/useTenant'
import { useConfig } from '../../contexts/ConfigContext'
import categoriesService from '../../services/categories'
import itemsService from '../../services/items'
import filesService from '../../services/files'

interface ItemFormModalProps {
  open: boolean
  onClose: () => void
  item?: {
    id: number
    title: string
    categoryId: number
    categoryName?: string
    totalCount: number
    availableCount: number
    description?: string
    fileUrl?: string
  }
  onSave: () => void
}

interface Category {
  id: string
  name: string
  description?: string
}

export default function ItemFormModal({ open, onClose, item, onSave }: ItemFormModalProps) {
  const { currentInstance } = useTenant()
  const { getCustomFields } = useConfig()
  const itemCustomFields = getCustomFields('item')
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: '',
    totalCount: 1,
    availableCount: 1,
    file: null as File | null,
    customFields: {} as Record<string, any>
  })
  const [categories, setCategories] = useState<Category[]>([])
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [dragActive, setDragActive] = useState(false)

  const initCustomFields = useCallback(() => {
    const customFieldsData: Record<string, any> = {}
    itemCustomFields.forEach(field => {
      if (field.fieldType === 'boolean') {
        customFieldsData[field.id] = false
      } else if (field.fieldType === 'number') {
        customFieldsData[field.id] = 0
      } else {
        customFieldsData[field.id] = ''
      }
    })
    return customFieldsData
  }, [itemCustomFields])

  useEffect(() => {
    if (!open) return // Don't update if modal is closed
    
    if (item) {
      setFormData({
        title: item.title,
        description: item.description || '',
        categoryId: item.categoryId.toString(),
        totalCount: item.totalCount,
        availableCount: item.availableCount,
        file: null,
        customFields: initCustomFields() // TODO: Load actual custom field values from item
      })
    } else {
      setFormData({
        title: '',
        description: '',
        categoryId: '',
        totalCount: 1,
        availableCount: 1,
        file: null,
        customFields: initCustomFields()
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item]) // Removed initCustomFields from dependencies

  useEffect(() => {
    if (open && currentInstance) {
      fetchCategories()
    }
  }, [open, currentInstance])

  const fetchCategories = async () => {
    try {
      const data = await categoriesService.getCategories()
      setCategories(data)
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return

    try {
      const newCategory = await categoriesService.createCategory({
        name: newCategoryName
      })
      setCategories([...categories, newCategory])
      setFormData({ ...formData, categoryId: newCategory.id })
      setNewCategoryName('')
      setShowNewCategory(false)
    } catch (error) {
      console.error('Failed to create category:', error)
    }
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      alert('File size must be less than 25MB')
      return
    }
    setFormData({ ...formData, file })
  }

  const handleCustomFieldChange = (fieldId: string, value: any) => {
    setFormData({
      ...formData,
      customFields: {
        ...formData.customFields,
        [fieldId]: value
      }
    })
  }

  const renderCustomField = (field: any) => {
    const value = formData.customFields[field.id] || ''
    
    switch (field.fieldType) {
      case 'text':
        return (
          <TextField
            key={field.id}
            fullWidth
            label={field.fieldName}
            value={value}
            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
            required={field.required}
          />
        )
      
      case 'number':
        return (
          <TextField
            key={field.id}
            fullWidth
            type="number"
            label={field.fieldName}
            value={value}
            onChange={(e) => handleCustomFieldChange(field.id, parseFloat(e.target.value) || 0)}
            required={field.required}
          />
        )
      
      case 'date':
        return (
          <TextField
            key={field.id}
            fullWidth
            type="date"
            label={field.fieldName}
            value={value}
            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
            InputLabelProps={{ shrink: true }}
            required={field.required}
          />
        )
      
      case 'boolean':
        return (
          <FormControlLabel
            key={field.id}
            control={
              <Switch
                checked={Boolean(value)}
                onChange={(e) => handleCustomFieldChange(field.id, e.target.checked)}
              />
            }
            label={field.fieldName}
          />
        )
      
      case 'select':
        return (
          <FormControl key={field.id} fullWidth required={field.required}>
            <InputLabel>{field.fieldName}</InputLabel>
            <Select
              value={value}
              onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
              label={field.fieldName}
            >
              {field.options?.map((option: string) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )
      
      default:
        return null
    }
  }

  const handleSave = async () => {
    try {
      // Generate a unique ID for new items
      const uniqueId = item ? undefined : `ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      const itemData = {
        uniqueId: uniqueId!,
        name: formData.title,
        description: formData.description,
        categoryId: formData.categoryId || undefined,
        totalCount: formData.totalCount,
        metadata: {
          customFields: formData.customFields
        }
      }

      let savedItem
      if (item) {
        // Update existing item
        savedItem = await itemsService.updateItem(item.id.toString(), {
          name: itemData.name,
          description: itemData.description,
          categoryId: itemData.categoryId,
          totalCount: itemData.totalCount,
          metadata: itemData.metadata
        })
      } else {
        // Create new item
        savedItem = await itemsService.createItem(itemData)
      }

      // Upload file if provided
      if (formData.file && savedItem) {
        await filesService.uploadFile(formData.file, savedItem.id)
      }

      onSave()
      onClose()
    } catch (error) {
      console.error('Failed to save item:', error)
      alert('Failed to save item. Please try again.')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {item ? 'Edit Item' : 'Add New Item'}
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Title"
            fullWidth
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter item description..."
          />

          {showNewCategory ? (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label="New Category Name"
                fullWidth
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateCategory()}
                autoFocus
              />
              <Button onClick={handleCreateCategory} variant="contained">
                Add
              </Button>
              <Button onClick={() => setShowNewCategory(false)}>
                Cancel
              </Button>
            </Box>
          ) : (
            <Autocomplete
              fullWidth
              options={[{ id: 'new', name: '+ Add New Category' }, ...categories]}
              getOptionLabel={(option) => option.name}
              value={categories.find(cat => cat.id === formData.categoryId) || null}
              onChange={(_, newValue) => {
                if (newValue?.id === 'new') {
                  setShowNewCategory(true)
                } else if (newValue) {
                  setFormData({ ...formData, categoryId: newValue.id })
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Category"
                  placeholder="Search categories..."
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  {option.id === 'new' ? (
                    <em>{option.name}</em>
                  ) : (
                    option.name
                  )}
                </Box>
              )}
            />
          )}

          <TextField
            label="Total Count"
            type="number"
            fullWidth
            value={formData.totalCount}
            onChange={(e) => setFormData({ 
              ...formData, 
              totalCount: parseInt(e.target.value) || 0,
              availableCount: Math.min(formData.availableCount, parseInt(e.target.value) || 0)
            })}
            inputProps={{ min: 1 }}
          />

          <TextField
            label="Available Count"
            type="number"
            fullWidth
            value={formData.availableCount}
            onChange={(e) => setFormData({ 
              ...formData, 
              availableCount: parseInt(e.target.value) || 0 
            })}
            inputProps={{ min: 0, max: formData.totalCount }}
            helperText="Auto-managed but editable for corrections"
          />

          {itemCustomFields.length > 0 && (
            <>
              <Divider sx={{ my: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Custom Fields
                </Typography>
              </Divider>
              {itemCustomFields.map(field => renderCustomField(field))}
            </>
          )}

          <Box
            sx={{
              border: 2,
              borderColor: dragActive ? 'primary.main' : 'grey.300',
              borderStyle: 'dashed',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: dragActive ? 'action.hover' : 'background.paper',
              transition: 'all 0.2s'
            }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = '.pdf,image/*'
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (file) handleFileSelect(file)
              }
              input.click()
            }}
          >
            <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body1" color="text.secondary">
              Drag and drop file here or click to browse
            </Typography>
            <Typography variant="caption" color="text.secondary">
              PDF or image files, max 25MB
            </Typography>
            {formData.file && (
              <Typography variant="body2" sx={{ mt: 2 }}>
                Selected: {formData.file.name}
              </Typography>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained"
          disabled={!formData.title || !currentInstance}
        >
          {item ? 'Save Changes' : 'Add Item'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}