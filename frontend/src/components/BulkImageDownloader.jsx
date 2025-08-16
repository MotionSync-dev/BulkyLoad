import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { 
  Download, 
  Upload, 
  FileText, 
  Eye, 
  EyeOff, 
  Trash2, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Info,
  ExternalLink,
  History,
  BarChart3
} from 'lucide-react'

const BulkImageDownloader = () => {
  const { isAuthenticated } = useAuth()
  const [urls, setUrls] = useState('')
  const [downloadProgress, setDownloadProgress] = useState({})
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadHistory, setDownloadHistory] = useState([])
  const [error, setError] = useState('')
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [previewUrls, setPreviewUrls] = useState([])
  const [stats, setStats] = useState(null)
  const [remainingDownloads, setRemainingDownloads] = useState(null)
  const fileInputRef = useRef(null)

  // Fetch user data and remaining downloads when component mounts or auth state changes
  useEffect(() => {
    console.log('BulkImageDownloader useEffect - isAuthenticated:', isAuthenticated);
    if (isAuthenticated) {
      // Force fresh data fetch for authenticated users
      fetchRemainingDownloads();
      fetchUserStats();
    } else {
      // For anonymous users, also fetch remaining downloads
      fetchRemainingDownloads();
    }
  }, [isAuthenticated]);

  // Force refresh subscription data when component mounts
  useEffect(() => {
    // Always fetch fresh data on component mount
    fetchRemainingDownloads();
  }, []);

  // Debug log when component renders
  useEffect(() => {
    console.log('BulkImageDownloader rendered - isAuthenticated:', isAuthenticated);
  });

  // Force refresh function for manual refresh
  const forceRefresh = () => {
    console.log('Force refreshing subscription data...');
    fetchRemainingDownloads();
    if (isAuthenticated) {
      fetchUserStats();
    }
  };

  const handleUrlInput = (e) => {
    setUrls(e.target.value)
    setError('')
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type)
      
      // Check file size (max 1MB)
      if (file.size > 1024 * 1024) {
        setError('File too large. Please use a file smaller than 1MB.')
        return
      }
      
             // Check file type - be more lenient with file types
       const allowedTypes = ['text/plain', 'text/csv', 'application/csv', '']
       const allowedExtensions = ['.txt', '.csv', '.list', '.urls']
       const hasValidType = allowedTypes.includes(file.type) || 
                           allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
       
       if (!hasValidType) {
         setError('Please upload a text file (.txt, .csv, .list, .urls) or a file with URLs.')
         return
       }
      
             const reader = new FileReader()
       reader.onload = (event) => {
         console.log('File content loaded, length:', event.target.result.length)
         console.log('Raw content preview:', event.target.result.substring(0, 200))
         
         let content = event.target.result
         
         // Handle different line endings (Windows \r\n, Mac \r, Unix \n)
         content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
         
         // Remove empty lines and trim
         content = content
           .split('\n')
           .map(line => line.trim())
           .filter(line => line.length > 0)
           .join('\n')
         
         console.log('Processed content length:', content.length)
         console.log('Number of non-empty lines:', content.split('\n').length)
         
         if (content.length === 0) {
           setError('File appears to be empty or contains no valid URLs. Please check the file content.')
           return
         }
         
         setUrls(content)
         setUploadedFileName(file.name)
         setError('')
         console.log('File uploaded successfully with', content.split('\n').length, 'lines')
       }
             reader.onerror = (error) => {
         console.error('Error reading file:', error)
         setError('Failed to read file. Please try again.')
       }
       
       // Try to read with UTF-8 encoding first, fallback to other methods
       try {
         reader.readAsText(file, 'UTF-8')
       } catch (encodingError) {
         console.log('UTF-8 failed, trying default encoding...')
         reader.readAsText(file)
       }
    } else {
      console.log('No file selected')
    }
  }

         const downloadImage = async (url, index) => {
       try {
         // Handle base64 data URLs
         if (url.startsWith('data:image/')) {
           try {
             console.log('Processing base64 data URL...')
             setDownloadProgress(prev => ({ ...prev, [index]: 10 }))
             
             // Extract base64 data and convert to blob
             const base64Data = url.split(',')[1]
             const mimeType = url.match(/data:([^;]+)/)?.[1] || 'image/png'
             
             // Convert base64 to blob
             const byteCharacters = atob(base64Data)
             const byteNumbers = new Array(byteCharacters.length)
             for (let i = 0; i < byteCharacters.length; i++) {
               byteNumbers[i] = byteCharacters.charCodeAt(i)
             }
             const byteArray = new Uint8Array(byteNumbers)
             const blob = new Blob([byteArray], { type: mimeType })
             
             setDownloadProgress(prev => ({ ...prev, [index]: 100 }))
             
             // Generate filename for base64
             const extension = mimeType.split('/')[1] || 'png'
             const filename = `base64-image-${index + 1}.${extension}`
             
             console.log('Base64 image processed:', { filename, blobSize: blob.size })
             
             return { success: true, filename, blob, url }
           } catch (base64Error) {
             console.error('Base64 processing failed:', base64Error)
             return { success: false, error: 'Invalid base64 data', url }
           }
         }
         
                   if (url.toLowerCase().endsWith('.svg')) {
        try {
          console.log('Processing SVG file...')
          setDownloadProgress(prev => ({ ...prev, [index]: 10 }))

          // Try multiple approaches for SVG
          let svgContent = null

          // First try: Direct download
          try {
            console.log('Trying direct SVG download...')
            const directResponse = await axios.get(url, {
              responseType: 'text',
              timeout: 30000
            })
            svgContent = directResponse.data
            console.log('Direct SVG download successful, size:', svgContent.length)
          } catch (directError) {
            console.log('Direct SVG download failed, trying CORS proxy...')
            
            // Second try: CORS proxy
            try {
              const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`
              console.log('Fetching SVG through proxy:', proxyUrl)
              
              const proxyResponse = await axios.get(proxyUrl, { 
                responseType: 'text',
                timeout: 30000
              })
              
              svgContent = proxyResponse.data
              console.log('Proxy SVG download successful, size:', svgContent.length)
            } catch (proxyError) {
              console.error('Both direct and proxy SVG download failed')
              throw new Error('Failed to download SVG content')
            }
          }

          // Validate SVG content
          if (!svgContent || svgContent.length === 0) {
            throw new Error('Empty SVG content received')
          }

          // Check if it's actually SVG content
          if (!svgContent.includes('<svg') && !svgContent.includes('<?xml')) {
            throw new Error('Content is not valid SVG')
          }

          setDownloadProgress(prev => ({ ...prev, [index]: 50 }))

          // Convert SVG to PNG using canvas
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          // Set canvas size (you can adjust these dimensions)
          canvas.width = 800
          canvas.height = 600
          
          // Create image from SVG
          return new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => {
              try {
                // Clear canvas and draw image
                ctx.clearRect(0, 0, canvas.width, canvas.height)
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
                
                // Convert to blob
                canvas.toBlob((blob) => {
                  if (blob) {
                    setDownloadProgress(prev => ({ ...prev, [index]: 100 }))
                    
                    // Generate filename (change extension to png)
                    let filename = url.split('/').pop() || `image_${index + 1}.png`
                    if (filename.toLowerCase().endsWith('.svg')) {
                      filename = filename.replace(/\.svg$/i, '.png')
                    } else if (!filename.toLowerCase().endsWith('.png')) {
                      filename = `image_${index + 1}.png`
                    }
                    
                    console.log('SVG converted to PNG successfully:', { filename, blobSize: blob.size })
                    resolve({ success: true, filename, blob, url })
                  } else {
                    reject(new Error('Failed to convert SVG to PNG'))
                  }
                }, 'image/png')
              } catch (error) {
                reject(new Error(`SVG to PNG conversion failed: ${error.message}`))
              }
            }
            
            img.onerror = () => {
              reject(new Error('Failed to load SVG as image'))
            }
            
            // Create data URL from SVG content
            const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' })
            const svgUrl = URL.createObjectURL(svgBlob)
            img.src = svgUrl
            
            // Clean up the object URL after a delay
            setTimeout(() => URL.revokeObjectURL(svgUrl), 1000)
          })
        } catch (svgError) {
          console.error('SVG processing failed:', svgError)
          return { success: false, error: `SVG processing failed: ${svgError.message}`, url }
        }
      }

      // Default image download (for non-SVGs) - try direct first, then proxy
      let response
      try {
        response = await axios.get(url, {
          responseType: 'blob',
          timeout: 30000,
          onDownloadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            )
            setDownloadProgress(prev => ({ ...prev, [index]: percentCompleted }))
          }
        })
      } catch (directError) {
        console.log('Direct download failed, trying CORS proxy...')
        
        // Try CORS proxy for non-SVG images
        try {
          const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`
          console.log('Fetching image through proxy:', proxyUrl)
          
          response = await axios.get(proxyUrl, {
            responseType: 'blob',
            timeout: 30000,
            onDownloadProgress: (progressEvent) => {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              )
              setDownloadProgress(prev => ({ ...prev, [index]: percentCompleted }))
            }
          })
          
          console.log('Image downloaded successfully through proxy')
        } catch (proxyError) {
          console.error('Both direct and proxy download failed:', proxyError)
          throw directError // Throw original error for better error message
        }
      }

             const contentType = response.headers['content-type'] || ''
       
       // Enhanced validation for different URL types
       const isImageByContentType = contentType.startsWith('image/')
       
       // Check for various URL patterns
       const urlPatterns = {
         // Direct file URLs with extensions
         directFile: url.toLowerCase().match(/\.(jpg|jpeg|png|gif|svg|webp|bmp|ico|tiff|tif)$/),
         // URLs with query parameters
         withQueryParams: url.toLowerCase().match(/\.(jpg|jpeg|png|gif|svg|webp|bmp|ico|tiff|tif)\?/),
         // URLs without extension but might be valid images
         noExtension: !url.toLowerCase().match(/\.(jpg|jpeg|png|gif|svg|webp|bmp|ico|tiff|tif)$/) && 
                     !url.toLowerCase().match(/\.(html|htm|php|asp|jsp|xml|json|txt|pdf|doc|docx)$/),
         // Base64 data URLs
         base64Data: url.startsWith('data:image/')
       }
       
       const isValidUrlType = isImageByContentType || 
                            urlPatterns.directFile || 
                            urlPatterns.withQueryParams || 
                            urlPatterns.noExtension || 
                            urlPatterns.base64Data
       
       if (!isValidUrlType) {
         // Additional check: try to validate the blob content
         try {
           const blob = response.data
           if (blob.size === 0) {
             return { success: false, error: 'Empty file received', url }
           }
           
           // Check if blob has image-like properties
           const blobType = blob.type
           if (blobType && !blobType.startsWith('image/') && !blobType.startsWith('text/')) {
             return { success: false, error: 'Invalid image format', url }
           }
           
           console.log('Content validation passed:', { 
             contentType, 
             blobType, 
             blobSize: blob.size,
             urlPatterns,
             isValidUrlType
           })
         } catch (validationError) {
           console.error('Content validation failed:', validationError)
           return { success: false, error: 'Invalid image format', url }
         }
       }

             // Enhanced filename generation for different URL types
       let filename = ''
       
       if (url.includes('?')) {
         // URLs with query parameters - extract filename before query params
         const urlWithoutParams = url.split('?')[0]
         const extractedName = urlWithoutParams.split('/').pop()
         if (extractedName && extractedName.includes('.')) {
           filename = extractedName
         } else {
           // Try to get extension from content-type
           const extension = contentType.split('/')[1]?.split(';')[0] || 'jpg'
           filename = `image-${index + 1}.${extension}`
         }
       } else if (url.match(/\.(jpg|jpeg|png|gif|svg|webp|bmp|ico|tiff|tif)$/)) {
         // Direct file URLs with extensions
         filename = url.split('/').pop()
       } else {
         // URLs without extension - try to get extension from content-type
         const extension = contentType.split('/')[1]?.split(';')[0] || 'jpg'
         const urlName = url.split('/').pop()
         if (urlName && !urlName.includes('.')) {
           filename = `${urlName}.${extension}`
         } else {
           filename = `image-${index + 1}.${extension}`
         }
       }
       
       // Fallback if filename is still empty
       if (!filename) {
         const extension = contentType.split('/')[1]?.split(';')[0] || 'jpg'
         filename = `image-${index + 1}.${extension}`
       }
       
       setDownloadProgress(prev => ({ ...prev, [index]: 100 }))
       
       return { success: true, filename, blob: response.data, url }
    } catch (error) {
      console.error(`Error downloading ${url}:`, error)
      return {
        success: false,
        error: 'Failed to download image (possibly CORS or bad URL)',
        url
      }
    }
  }

  const startDownload = async () => {
    if (!urls.trim()) {
      setError('Please enter at least one URL')
      return
    }

    const urlList = urls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0)

    if (urlList.length === 0) {
      setError('Please enter at least one valid URL')
      return
    }

    // Check download limits before starting
    if (!remainingDownloads) {
      await fetchRemainingDownloads();
    }

    // After fetching, check if we have enough remaining downloads
    if (remainingDownloads?.limit !== 'Unlimited') {
      const remaining = remainingDownloads?.remaining || 0;
      if (urlList.length > remaining) {
        setError(`Download limit exceeded. You can only download ${remaining} more images today.`);
        return;
      }
    }

    setIsDownloading(true)
    setDownloadProgress({})
    setError('')

    const results = []
    const successfulDownloads = []

    // Download all files first
    for (let i = 0; i < urlList.length; i++) {
      const result = await downloadImage(urlList[i], i)
      results.push(result)
      
      if (result.success) {
        successfulDownloads.push(result)
      }

      if (i < urlList.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // Handle download based on number of files
    if (successfulDownloads.length === 1) {
      // Single file - download directly
      const file = successfulDownloads[0]
      try {
        saveAs(file.blob, file.filename)
        console.log('Single file downloaded:', file.filename)
      } catch (saveError) {
        console.log('File-saver failed, trying direct download link...')
        const downloadUrl = URL.createObjectURL(file.blob)
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = file.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(downloadUrl)
      }
    } else if (successfulDownloads.length > 1) {
      // Multiple files - create ZIP
      try {
        console.log('Creating ZIP with', successfulDownloads.length, 'files')
        
        const zip = new JSZip()
        
        // Add each file to the ZIP
        successfulDownloads.forEach((file, index) => {
          zip.file(file.filename, file.blob)
          console.log(`Added to ZIP: ${file.filename}`)
        })
        
        // Generate ZIP blob
        const zipBlob = await zip.generateAsync({ type: 'blob' })
        
        // Download the ZIP file
        const zipFilename = `bulk-images-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.zip`
        saveAs(zipBlob, zipFilename)
        
        console.log('ZIP download completed:', zipFilename)
        
      } catch (error) {
        console.error('Error creating ZIP:', error)
        setError('Failed to create ZIP file')
      }
    }

    setDownloadHistory(prev => [
      {
        timestamp: new Date().toLocaleString(),
        totalUrls: urlList.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      },
      ...prev.slice(0, 9)
    ])

    setIsDownloading(false)
    setDownloadProgress({})
  }

  const clearHistory = () => setDownloadHistory([])

  const validateUrls = async () => {
    const urlList = urls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0)

    if (urlList.length === 0) {
      toast.error('Please enter at least one URL')
      return
    }

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/download/validate`, {
        urls: urlList
      })

      const { validations, summary } = response.data
      const validUrls = validations.filter(v => v.valid).map(v => v.url)
      
      setPreviewUrls(validUrls)
      setShowPreview(true)
      
      toast.success(`Found ${summary.valid} valid images out of ${summary.total} URLs`)
    } catch (error) {
      toast.error('Failed to validate URLs')
    }
  }

  const openImagesInTabs = () => {
    const urlList = urls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0)

    urlList.forEach(url => {
      window.open(url, '_blank')
    })
  }

  // Fetch user stats
  const fetchUserStats = async () => {
    if (!isAuthenticated) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/user/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data.stats);
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  };

  // Fetch remaining downloads for all users (anonymous and authenticated)
  const fetchRemainingDownloads = async () => {
    try {
      console.log('=== FETCH REMAINING DOWNLOADS DEBUG ===');
      console.log('isAuthenticated:', isAuthenticated);
      
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);
      console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'none');
      
      // Reset while fetching to avoid showing stale data
      setRemainingDownloads(null);

      // Simplified headers to avoid CORS issues
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      console.log('Request headers:', headers);
      
      if (isAuthenticated) {
        console.log('Making authenticated API call...');
        // For authenticated users, fetch download limits directly
        // The /api/download/remaining endpoint handles both free and pro users
        const downloadResponse = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/download/remaining`, {
          headers
        });
        console.log('✅ Authenticated user download response:', downloadResponse.data);
        console.log('Response status:', downloadResponse.status);
        setRemainingDownloads(downloadResponse.data);
      } else {
        console.log('Anonymous user, fetching download count');
        // For anonymous users, fetch remaining downloads
        const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/download/remaining`, {
          headers: {} // No headers for anonymous users
        });
        console.log('Anonymous user download response:', response.data);
        setRemainingDownloads(response.data);
      }
    } catch (error) {
      console.error('❌ Failed to fetch remaining downloads:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
      
      // Safer defaults on error: never assume Unlimited
      const fallbackData = {
        current: 0,
        remaining: isAuthenticated ? 10 : 5,
        limit: isAuthenticated ? 10 : 5,
        error: true
      };
      console.log('Setting fallback data:', fallbackData);
      setRemainingDownloads(fallbackData);
    }
  };

  // Fetch remaining downloads on component mount or auth change
  useEffect(() => {
    // Clear old state when auth state changes to avoid stale UI
    setRemainingDownloads(null);
    fetchRemainingDownloads();
  }, [isAuthenticated]);

  // Add webhook listener to refresh data when subscription changes
  useEffect(() => {
    const handleWebhookUpdate = () => {
      console.log('🔄 Webhook update detected, refreshing data...');
      fetchRemainingDownloads();
    };

    // Listen for custom event that can be triggered by webhook updates
    window.addEventListener('subscription-updated', handleWebhookUpdate);
    
    // Also refresh data periodically for all users (every 10 seconds for faster response)
    let intervalId;
    intervalId = setInterval(() => {
      console.log('🔄 Periodic refresh of download data...');
      fetchRemainingDownloads();
      if (isAuthenticated) {
        fetchUserStats();
      }
    }, 10000); // 10 seconds for faster updates

    return () => {
      window.removeEventListener('subscription-updated', handleWebhookUpdate);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAuthenticated]);

  const downloadViaBackend = async () => {
    const urlList = urls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0)

    if (urlList.length === 0) {
      toast.error('Please enter at least one URL')
      return
    }

    setIsDownloading(true)
    setDownloadProgress({})
    setError('')

    try {
      // Include auth token if user is authenticated
      const config = {}
      if (isAuthenticated) {
        const token = localStorage.getItem('token')
        if (token) {
          config.headers = {
            'Authorization': `Bearer ${token}`
          }
        }
      }

      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/download/images`, {
        urls: urlList
      }, config)

      const { results, summary, downloads } = response.data

             // Create ZIP file from backend data
       if (downloads.length > 0) {
         console.log('Creating ZIP with downloads:', downloads)
         const zip = new JSZip()
         
                   // Process downloads sequentially to handle SVG conversion
          for (let index = 0; index < downloads.length; index++) {
            const download = downloads[index]
            console.log(`Processing download ${index + 1}:`, download)
            
            // Convert data URL back to blob
            const base64Data = download.dataUrl.split(',')[1]
            const mimeType = download.dataUrl.match(/data:([^;]+)/)?.[1] || 'image/jpeg'
            
            console.log('MIME type:', mimeType, 'Base64 length:', base64Data.length)
            
            const byteCharacters = atob(base64Data)
            const byteNumbers = new Array(byteCharacters.length)
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i)
            }
            const byteArray = new Uint8Array(byteNumbers)
            const blob = new Blob([byteArray], { type: mimeType })
            
            console.log('Blob created:', { size: blob.size, type: blob.type })
            
            // Handle SVG conversion to PNG
            if (download.isSvg || mimeType === 'image/svg+xml') {
              console.log('Converting SVG to PNG...')
              
              // Create a promise to handle SVG conversion
              const svgConversionPromise = new Promise((resolve, reject) => {
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')
                
                // Set canvas size
                canvas.width = 800
                canvas.height = 600
                
                const img = new Image()
                img.onload = () => {
                  try {
                    // Clear canvas and draw image
                    ctx.clearRect(0, 0, canvas.width, canvas.height)
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
                    
                    // Convert to blob
                    canvas.toBlob((pngBlob) => {
                      if (pngBlob) {
                        // Generate PNG filename
                        let filename = download.filename
                        if (filename.toLowerCase().endsWith('.svg')) {
                          filename = filename.replace(/\.svg$/i, '.png')
                        } else if (!filename.toLowerCase().endsWith('.png')) {
                          filename = `image_${index + 1}.png`
                        }
                        
                        // Sanitize filename
                        const sanitizedFilename = filename.replace(/[?&=]/g, '_')
                        console.log('SVG converted to PNG:', sanitizedFilename, 'Size:', pngBlob.size)
                        
                        zip.file(sanitizedFilename, pngBlob)
                        resolve()
                      } else {
                        reject(new Error('Failed to convert SVG to PNG'))
                      }
                    }, 'image/png')
                  } catch (error) {
                    reject(new Error(`SVG to PNG conversion failed: ${error.message}`))
                  }
                }
                
                img.onerror = () => {
                  reject(new Error('Failed to load SVG as image'))
                }
                
                // Create object URL from blob
                const svgUrl = URL.createObjectURL(blob)
                img.src = svgUrl
                
                // Clean up the object URL after a delay
                setTimeout(() => URL.revokeObjectURL(svgUrl), 1000)
              })
              
              // Wait for SVG conversion to complete
              await svgConversionPromise
            } else {
              // Regular image - add to ZIP as-is
              const sanitizedFilename = download.filename.replace(/[?&=]/g, '_')
              console.log('Adding to ZIP:', sanitizedFilename, 'Size:', blob.size)
              
              zip.file(sanitizedFilename, blob)
            }
          }

         console.log('Generating ZIP...')
         const zipBlob = await zip.generateAsync({ type: 'blob' })
         console.log('ZIP generated:', { size: zipBlob.size, type: zipBlob.type })
         
         const zipFilename = `bulk-images-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.zip`
         console.log('Downloading ZIP as:', zipFilename)
         
         saveAs(zipBlob, zipFilename)

        toast.success(`Successfully downloaded ${summary.successful} images`)
        
        // Always refresh download count to show accurate remaining downloads
        await fetchRemainingDownloads();
        
        // Update user stats for authenticated users
        if (isAuthenticated) {
          await fetchUserStats();
        }
        
        // Trigger webhook update event for other components
        if (summary.successful > 0) {
          console.log('🔄 Downloads completed, triggering data refresh...');
          window.dispatchEvent(new CustomEvent('subscription-updated'));
          
          // Show updated download count immediately
          toast.success(`Download completed! ${summary.successful} images downloaded. Check your remaining downloads below.`);
        }
      }

      setDownloadHistory(prev => [
        {
          id: Date.now(),
          timestamp: new Date().toLocaleString(),
          totalCount: urlList.length,
          successCount: summary.successful,
          failedCount: summary.failed,
          results
        },
        ...prev.slice(0, 9)
      ])

    } catch (error) {
      console.error('Backend download error:', error)
      
      if (error.response?.status === 403) {
        const errorData = error.response.data
        if (errorData.error === 'Download limit exceeded') {
          toast.error(`Download limit exceeded. ${errorData.limits.remaining} downloads remaining today.`)
        } else if (errorData.error.includes('Anonymous users can only download up to 5 images per day')) {
          toast.error(`Daily limit exceeded. You have ${errorData.remaining} downloads remaining. Please sign in for unlimited downloads.`)
          // Refresh remaining downloads count
          fetchRemainingDownloads();
        } else if (errorData.error.includes('Registered users can download up to 10 images per day')) {
          toast.error(`Daily limit exceeded. You have ${errorData.limits.remaining} downloads remaining. Subscribe for unlimited downloads.`)
          // Refresh remaining downloads count
          fetchRemainingDownloads();
        } else {
          toast.error(errorData.error || 'Download limit exceeded')
        }
      } else {
        toast.error('Failed to download images via backend')
      }
    } finally {
      setIsDownloading(false)
      setDownloadProgress({})
    }
  }

  return (
    <div className="space-y-6">
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Left Column - Input */}
        <div className="lg:col-span-2 space-y-6">
          {/* URL Input Section */}
          <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                Enter Image URLs
              </h2>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary text-sm px-3 py-2 flex items-center justify-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Upload File</span>
                  <span className="sm:hidden">Upload</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.csv,.list,.urls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {uploadedFileName && (
                  <div className="text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
                    📎 {uploadedFileName}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <textarea
                id="urls"
                value={urls}
                onChange={handleUrlInput}
                placeholder="Enter image URLs here, one per line...&#10;Example:&#10;https://example.com/image1.jpg&#10;https://example.com/image2.png"
                rows={8}
                disabled={isDownloading}
                className="input-field resize-none whitespace-pre overflow-x-auto text-sm sm:text-base"
                wrap="off"
              />
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <div className="text-sm text-gray-600">
                  {urls.split('\n').filter(url => url.trim()).length} URLs entered
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <button
                    onClick={validateUrls}
                    disabled={!urls.trim() || isDownloading}
                    className="btn-secondary text-sm px-3 py-2"
                  >
                    Validate URLs
                  </button>
                  <button
                    onClick={startDownload}
                    disabled={!urls.trim() || isDownloading}
                    className="btn-primary text-sm px-3 py-2 flex items-center justify-center space-x-2"
                  >
                    {isDownloading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Downloading...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Download All</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Download Progress */}
          {isDownloading && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Download Progress</h3>
              <div className="space-y-3">
                {Object.entries(downloadProgress).map(([index, progress], i) => {
                  const url = urls.split('\n')[parseInt(index)];
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 truncate flex-1">{url}</span>
                        <span className="text-gray-900 ml-2">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            progress === 100 ? 'bg-green-500' : 'bg-primary-600'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="card border-l-4 border-red-500 bg-red-50">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Stats & History */}
        <div className="space-y-6">
          {/* User Stats */}
          {isAuthenticated && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Stats</h3>
              {stats ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Downloads:</span>
                    <span className="font-medium">{stats.totalDownloads}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Success Rate:</span>
                    <span className="font-medium">{stats.successRate}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Images:</span>
                    <span className="font-medium">{stats.totalAttempted}</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No download history yet</div>
              )}
            </div>
          )}

          {/* Subscription Status */}
          {isAuthenticated && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Subscription Status</h3>
                <button
                  onClick={forceRefresh}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium hover:bg-primary-50 px-2 py-1 rounded transition-colors"
                  title="Refresh subscription status"
                >
                  🔄 Refresh
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Current Plan:</span>
                  <span className="font-medium text-primary-600">
                    {remainingDownloads?.limit === 'Unlimited' ? 'Pro' : 'Free'}
                  </span>
                </div>
                {remainingDownloads?.limit === 'Unlimited' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium text-green-600">Active</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Daily Limit:</span>
                  <span className="font-medium">
                    {remainingDownloads?.limit === 'Unlimited' ? '∞ Unlimited' : remainingDownloads?.limit || 'Loading...'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Download Limits */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Download Limits</h3>
              <button
                onClick={forceRefresh}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium hover:bg-primary-50 px-2 py-1 rounded transition-colors"
                title="Refresh download counts"
              >
                🔄 Refresh
              </button>
            </div>
            {remainingDownloads ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Today's Downloads:</span>
                  <span className="font-medium">{remainingDownloads.current}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Remaining:</span>
                  <span className="font-medium text-primary-600">
                    {remainingDownloads.remaining === 'Unlimited' ? '∞' : remainingDownloads.remaining}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Daily Limit:</span>
                  <span className="font-medium">{remainingDownloads.limit}</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">Loading...</div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={openImagesInTabs}
                disabled={!urls.trim()}
                className="w-full btn-secondary text-sm px-3 py-2 flex items-center justify-center space-x-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open in Tabs</span>
              </button>
              <button
                onClick={clearHistory}
                disabled={downloadHistory.length === 0}
                className="w-full btn-error text-sm px-3 py-2 flex items-center justify-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear History</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Download History */}
      {downloadHistory.length > 0 && (
        <div className="mt-8">
          <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
              <h2 className="text-xl font-semibold text-gray-900">Download History</h2>
              <button
                onClick={clearHistory}
                className="btn-error text-sm px-3 py-2"
              >
                Clear All
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {downloadHistory.map((item, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        Download #{item.id}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total:</span>
                        <span className="font-medium">{item.totalCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Success:</span>
                        <span className="font-medium text-green-600">{item.successCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Failed:</span>
                        <span className="font-medium text-red-600">{item.failedCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BulkImageDownloader
