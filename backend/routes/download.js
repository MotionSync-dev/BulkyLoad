import express from 'express';
import axios from 'axios';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import User from '../models/User.js';
import AnonymousSession from '../models/AnonymousSession.js';

const router = express.Router();

// Download images endpoint
router.post('/images', optionalAuth, async (req, res) => {
  try {
    const { urls } = req.body;
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'Please provide an array of image URLs' });
    }

    if (urls.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 URLs allowed per request' });
    }

        // Check download limits for authenticated users
    if (req.user) {
      const user = await User.findById(req.user.userId);
      if (user) {
        const limitCheck = await user.canDownload(urls.length);
        
        if (!limitCheck.canDownload) {
          const errorMessage = limitCheck.userType === 'registered' 
            ? 'Registered users can download up to 10 images per day. Subscribe for unlimited downloads.'
            : 'Download limit exceeded';
            
          return res.status(403).json({
            error: errorMessage,
            userType: limitCheck.userType,
            limits: {
              current: limitCheck.current,
              remaining: limitCheck.remaining,
              limit: limitCheck.limit,
              requested: urls.length
            }
          });
        }

        // Note: Download count will be updated after successful downloads at the end of the function
      }
    } else {
      // For unauthenticated users, implement IP-based tracking
      const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
      
      // Get or create anonymous user session
      let anonymousSession = await AnonymousSession.findOne({ ip: clientIP });
      
      if (!anonymousSession) {
        anonymousSession = new AnonymousSession({
          ip: clientIP,
          dailyDownloads: { count: 0, resetDate: new Date() }
        });
      }
      
      // Check if it's a new day and reset count
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const resetDate = new Date(anonymousSession.dailyDownloads.resetDate);
      resetDate.setHours(0, 0, 0, 0);
      
      if (today.getTime() !== resetDate.getTime()) {
        anonymousSession.dailyDownloads.count = 0;
        anonymousSession.dailyDownloads.resetDate = new Date();
      }
      
      const currentCount = anonymousSession.dailyDownloads.count;
      const limit = 5; // Anonymous users: 5 downloads per day
      
      if (currentCount + urls.length > limit) {
        return res.status(403).json({
          error: 'Anonymous users can only download up to 5 images per day. Please sign up for 10 downloads per day or subscribe for unlimited downloads.',
          userType: 'anonymous',
          limit: limit,
          current: currentCount,
          remaining: Math.max(0, limit - currentCount),
          requested: urls.length
        });
      }
      
      // Note: Anonymous download count will be updated after successful downloads
    }

    const results = [];
    const successfulDownloads = [];

    // Download images
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      try {
        // Check if it's an SVG file
        const isSvg = url.toLowerCase().endsWith('.svg');
        let response;
        
        // First try direct download
        try {
          response = await axios.get(url, {
            responseType: isSvg ? 'text' : 'arraybuffer',
            timeout: 30000,
            maxContentLength: 10 * 1024 * 1024, // 10MB limit
            headers: {
              'Accept': isSvg ? 'image/svg+xml,text/plain' : 'image/*,application/octet-stream',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Referer': url
            },
            // Follow redirects for image URLs
            maxRedirects: 5,
            validateStatus: function (status) {
              return status >= 200 && status < 400; // Accept redirects
            }
          });
        } catch (error) {
          // If CORS error or other failure, try using CORS proxy
          if (error.code === 'ERR_NETWORK' || error.response?.status === 403 || error.message.includes('CORS')) {
            console.log(`Direct download failed for ${url}, trying CORS proxy...`);
            
            // List of CORS proxies to try
            const corsProxies = [
              'https://corsproxy.io/?',
              'https://api.allorigins.win/raw?url=',
              'https://api.codetabs.com/v1/proxy?quest='
            ];
            
            let proxySuccess = false;
            
            // Try each proxy until one works
            for (const proxy of corsProxies) {
              try {
                const proxyUrl = proxy + encodeURIComponent(url);
                console.log(`Trying proxy: ${proxyUrl}`);
                
                response = await axios.get(proxyUrl, {
                  responseType: isSvg ? 'text' : 'arraybuffer',
                  timeout: 30000,
                  maxContentLength: 10 * 1024 * 1024,
                  headers: {
                    'Accept': isSvg ? 'image/svg+xml,text/plain' : 'image/*,application/octet-stream',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Referer': url
                  },
                  // Follow redirects for image URLs
                  maxRedirects: 5,
                  validateStatus: function (status) {
                    return status >= 200 && status < 400; // Accept redirects
                  }
                });
                
                console.log(`Proxy download successful for ${url}`);
                proxySuccess = true;
                break;
              } catch (proxyError) {
                console.log(`Proxy ${proxy} failed:`, proxyError.message);
                continue;
              }
            }
            
            // If all proxies fail, throw the original error
            if (!proxySuccess) {
              console.log(`All proxies failed for ${url}`);
              throw error;
            }
          } else {
            // For non-CORS errors, throw immediately
            throw error;
          }
        }

        const contentType = response.headers['content-type'];
        
        // Debug logging for content type and response
        console.log(`Download debug for ${url}:`, {
          contentType,
          contentLength: response.headers['content-length'],
          responseSize: response.data.length,
          isSvg
        });
        
                 // For SVG files, check if content is valid
         if (isSvg) {
           const svgContent = response.data;
           if (!svgContent || svgContent.length === 0) {
             results.push({
               url,
               success: false,
               error: 'Empty SVG content'
             });
             continue;
           }
           
           // Check if it's actually SVG content
           if (!svgContent.includes('<svg') && !svgContent.includes('<?xml')) {
             results.push({
               url,
               success: false,
               error: 'Invalid SVG content'
             });
             continue;
           }
           
           // For SVG files, we'll send the SVG content as-is
           // The frontend will handle the conversion to PNG
           const base64 = Buffer.from(svgContent, 'utf8').toString('base64');
           const dataUrl = `data:${contentType};base64,${base64}`;
           
           // Generate filename for SVG (will be converted to PNG by frontend)
           let filename = url.split('/').pop() || `image-${i + 1}.svg`;
           if (!filename.toLowerCase().endsWith('.svg')) {
             filename = `image-${i + 1}.svg`;
           }
           
           // Sanitize filename to avoid ZIP issues
           filename = filename.replace(/[?&=]/g, '_');

           successfulDownloads.push({
             url,
             filename,
             dataUrl,
             size: svgContent.length,
             isSvg: true // Flag to indicate this is an SVG that needs conversion
           });

           results.push({
             url,
             success: true,
             filename,
             size: svgContent.length
           });
           
         } else {
          // Handle regular images - be more flexible with content types
          if (!contentType.startsWith('image/') && !contentType.includes('octet-stream')) {
            // Try to detect if it's actually an image by checking the first few bytes
            const firstBytes = response.data.slice(0, 4);
            const isJPEG = firstBytes[0] === 0xFF && firstBytes[1] === 0xD8;
            const isPNG = firstBytes[0] === 0x89 && firstBytes[1] === 0x50 && firstBytes[2] === 0x4E && firstBytes[3] === 0x47;
            const isGIF = firstBytes[0] === 0x47 && firstBytes[1] === 0x49 && firstBytes[2] === 0x46;
            const isWebP = firstBytes[0] === 0x52 && firstBytes[1] === 0x49 && firstBytes[2] === 0x46 && firstBytes[3] === 0x57;
            
            if (!isJPEG && !isPNG && !isGIF && !isWebP) {
              results.push({
                url,
                success: false,
                error: 'Not an image file'
              });
              continue;
            }
            
            // If we detect it's an image but content-type is wrong, fix it
            if (isJPEG) contentType = 'image/jpeg';
            else if (isPNG) contentType = 'image/png';
            else if (isGIF) contentType = 'image/gif';
            else if (isWebP) contentType = 'image/webp';
          }

          // Convert to base64
          const base64 = Buffer.from(response.data, 'binary').toString('base64');
          const dataUrl = `data:${contentType};base64,${base64}`;

          // Generate filename - handle Unsplash and other complex URLs better
          let filename = '';
          
          // Try to extract filename from URL path
          const urlPath = url.split('?')[0]; // Remove query parameters
          const pathParts = urlPath.split('/');
          const lastPart = pathParts[pathParts.length - 1];
          
          if (lastPart && lastPart.includes('.')) {
            // URL has a filename with extension
            filename = lastPart;
          } else if (lastPart && lastPart.length > 0) {
            // URL has a name but no extension
            const extension = contentType.split('/')[1] || 'jpg';
            filename = `${lastPart}.${extension}`;
          } else {
            // Generate generic filename
            const extension = contentType.split('/')[1] || 'jpg';
            filename = `image-${i + 1}.${extension}`;
          }
          
          // Sanitize filename to avoid ZIP issues
          filename = filename.replace(/[?&=]/g, '_');

          successfulDownloads.push({
            url,
            filename,
            dataUrl,
            size: response.data.length
          });

          results.push({
            url,
            success: true,
            filename,
            size: response.data.length
          });
        }

      } catch (error) {
        console.error(`Error downloading ${url}:`, error.message);
        results.push({
          url,
          success: false,
          error: 'Failed to download image'
        });
      }
    }

    // Update download count for anonymous users
    if (!req.user) {
      const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
      let anonymousSession = await AnonymousSession.findOne({ ip: clientIP });
      
      if (anonymousSession) {
        const successfulCount = results.filter(r => r.success).length;
        
        // Only update count for successful downloads
        if (successfulCount > 0) {
          anonymousSession.dailyDownloads.count += successfulCount;
          await anonymousSession.save();
          
          console.log('Anonymous download count after update:', {
            ip: clientIP,
            dailyCount: anonymousSession.dailyDownloads.count,
            resetDate: anonymousSession.dailyDownloads.resetDate,
            successfulDownloads: successfulCount,
            remaining: Math.max(0, 5 - anonymousSession.dailyDownloads.count)
          });
        }
      }
    }

    // Update download count and history for authenticated users
    if (req.user) {
      const user = await User.findById(req.user.userId);
      if (user) {
        const successfulCount = results.filter(r => r.success).length;
        
        // Only update count for successful downloads
        if (successfulCount > 0) {
          await user.updateDailyCount(successfulCount);
        }
        
        // Then update history
        await user.updateDownloadHistory({
          urls: urls,
          successCount: successfulCount,
          failedCount: results.filter(r => !r.success).length,
          totalCount: urls.length
        });
        
        // Double-check final counts
        const finalCheck = await user.canDownload(0);
        console.log('Final download counts:', {
          userId: user._id,
          email: user.email,
          dailyCount: user.dailyDownloads.count,
          resetDate: user.dailyDownloads.resetDate,
          remaining: finalCheck.remaining,
          successfulDownloads: successfulCount,
          historyCount: user.downloadHistory.length,
          subscription: user.subscription
        });
      }
    }

         console.log('Sending response with successful downloads:', successfulDownloads.length)
     successfulDownloads.forEach((download, index) => {
       console.log(`Download ${index + 1}:`, {
         filename: download.filename,
         size: download.size,
         dataUrlLength: download.dataUrl.length
       })
     })

     res.json({
       message: 'Download completed',
       results,
       summary: {
         total: urls.length,
         successful: results.filter(r => r.success).length,
         failed: results.filter(r => !r.success).length
       },
       downloads: successfulDownloads
     });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to process download request' });
  }
});

// Get download history (authenticated users only)
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      history: user.downloadHistory || []
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to fetch download history' });
  }
});

// Clear download history (authenticated users only)
router.delete('/history', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.downloadHistory = [];
    
    res.json({
      message: 'Download history cleared successfully'
    });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({ error: 'Failed to clear download history' });
  }
});

// Debug endpoint for user download data (remove in production)
router.get('/debug-user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findByEmail(email);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const downloadCheck = await user.canDownload(0);
    
    res.json({
      userId: user._id,
      email: user.email,
      subscription: user.subscription,
      dailyDownloads: user.dailyDownloads,
      downloadCheck,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    console.error('Debug user error:', error);
    res.status(500).json({ error: 'Failed to get user debug info' });
  }
});

// Get remaining downloads for both authenticated and anonymous users
router.get('/remaining', optionalAuth, async (req, res) => {
  try {
    console.log('Remaining downloads endpoint hit:', {
      hasUser: !!req.user,
      userId: req.user?.userId,
      headers: req.headers.authorization ? 'Bearer token present' : 'No auth header'
    });

    if (req.user) {
      // For authenticated users
      const user = await User.findById(req.user.userId);
      if (!user) {
        console.log('User not found for ID:', req.user.userId);
        return res.status(404).json({ error: 'User not found' });
      }

      // Check download limits and subscription status
      const downloadCheck = await user.canDownload(0);
      console.log('Remaining downloads check for user:', {
        userId: user._id,
        email: user.email,
        subscription: user.subscription,
        dailyCount: user.dailyDownloads.count,
        downloadCheck
      });

      res.json({
        isAuthenticated: true,
        userType: downloadCheck.userType,
        current: downloadCheck.current,
        remaining: downloadCheck.remaining,
        limit: downloadCheck.limit
      });
    } else {
      // For anonymous users
      const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
      
      let anonymousSession = await AnonymousSession.findOne({ ip: clientIP });
      
      if (!anonymousSession) {
        // Create new session if doesn't exist
        anonymousSession = new AnonymousSession({
          ip: clientIP,
          dailyDownloads: { count: 0, resetDate: new Date() }
        });
        await anonymousSession.save();
      }
      
      // Check if it's a new day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const resetDate = new Date(anonymousSession.dailyDownloads.resetDate);
      resetDate.setHours(0, 0, 0, 0);
      
      if (today.getTime() !== resetDate.getTime()) {
        anonymousSession.dailyDownloads.count = 0;
        anonymousSession.dailyDownloads.resetDate = new Date();
        await anonymousSession.save();
      }

      const limit = 5; // Anonymous limit
      const current = anonymousSession.dailyDownloads.count;
      const remaining = Math.max(0, limit - current);

      console.log('Remaining downloads check for anonymous:', {
        ip: clientIP,
        current,
        remaining,
        limit,
        resetDate: anonymousSession.dailyDownloads.resetDate
      });
      
      res.json({
        isAuthenticated: false,
        userType: 'anonymous',
        current,
        remaining,
        limit
      });
    }
  } catch (error) {
    console.error('Remaining downloads error:', error);
    res.status(500).json({ error: 'Failed to get remaining downloads' });
  }
});

// Validate image URLs
router.post('/validate', async (req, res) => {
  try {
    const { urls } = req.body;
    
    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: 'Please provide an array of URLs' });
    }

    const validations = [];

    for (const url of urls) {
      try {
        const response = await axios.head(url, {
          timeout: 10000
        });

        const contentType = response.headers['content-type'];
        const isValidImage = contentType && contentType.startsWith('image/');
        const contentLength = response.headers['content-length'];

        validations.push({
          url,
          valid: isValidImage,
          contentType,
          contentLength: contentLength ? parseInt(contentLength) : null,
          accessible: true
        });

      } catch (error) {
        validations.push({
          url,
          valid: false,
          accessible: false,
          error: error.message
        });
      }
    }

    res.json({
      validations,
      summary: {
        total: urls.length,
        valid: validations.filter(v => v.valid).length,
        accessible: validations.filter(v => v.accessible).length
      }
    });

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: 'Failed to validate URLs' });
  }
});

export default router; 