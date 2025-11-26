# GTM Docs Editor Enhancement Guide

## 🎨 New Features Overview

### Image Management
- **Drag & Drop Upload**: Drag images directly into the editor
- **Crop & Resize**: Edit images before uploading with visual crop tool
- **Smart Compression**: Automatic optimization to 1920px @ 85% quality
- **Resizable in Editor**: Drag corner handles to resize inserted images
- **Alignment Options**: Left, center, right alignment for images
- **URL Import**: Paste image URLs as alternative to file upload

### Rich Typography
- **Smart Quotes**: `"text"` → `"text"` (curved quotes)
- **Em Dash**: `--` → `—` (long dash for ranges/breaks)
- **Ellipsis**: `...` → `…` (proper ellipsis character)
- **Copyright**: `(c)` → `©`
- **Trademark**: `(tm)` → `™`
- **Registered**: `(r)` → `®`
- **Arrows**: `->` → `→`, `<-` → `←`

### Multimedia
- **YouTube Embeds**: Paste YouTube URLs to embed videos
- **Responsive Video**: Auto 16:9 aspect ratio with neo-brutalist borders

### Editor Experience
- **Character Count**: Live word/character count in footer
- **Focus Highlighting**: Active editing block has yellow shadow
- **Gapcursor**: Navigate through empty table cells and after images
- **Visual Drop Indicator**: 4px black line shows where content will drop

## 🚀 Quick Setup

### 1. Storage Bucket Setup (Required for Image Upload)

Run the SQL script to create storage bucket and policies:

```bash
# Copy the SQL file content
cat SETUP_STORAGE_BUCKET.sql
```

Then in **Supabase Dashboard**:
1. Go to https://supabase.com/dashboard/project/jffnzpdcmdalxqhkfymx
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Paste the entire `SETUP_STORAGE_BUCKET.sql` content
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. Verify output shows bucket created and 3 policies active

### 2. Verify Storage Configuration

After running the SQL:

**Check Bucket:**
- Go to **Storage** in Supabase dashboard
- You should see `workspace-images` bucket
- Settings should show:
  - Public: ✅ Yes
  - File size limit: 5 MB
  - Allowed types: JPEG, PNG, WebP, GIF

**Check Policies:**
- Click on `workspace-images` bucket
- Go to **Policies** tab
- Should see 3 policies:
  - ✅ "Users can upload to their workspace" (INSERT)
  - ✅ "Images are publicly readable" (SELECT)
  - ✅ "Users can delete their workspace images" (DELETE)

## 🧪 Testing Guide

### Test Typography Features

Open any GTM document and try typing:

```
Type this:           Converts to:
-----------          ------------
"hello world"    →   "hello world"
--               →   —
...              →   …
(c)              →   ©
(tm)             →   ™
(r)              →   ®
->               →   →
<-               →   ←
```

### Test Image Upload

**Drag & Drop:**
1. Open a GTM document
2. Click hamburger menu (☰) → Media → Insert Image
3. Drag an image file into the upload zone
4. Crop/resize if desired (toggle Crop button)
5. Add alt text for accessibility
6. Click Upload
7. Watch progress bar: Validating → Uploading → Complete

**URL Import:**
1. Click Insert Image button
2. Click "Use URL" tab
3. Paste image URL (e.g., `https://example.com/image.jpg`)
4. Add alt text
5. Click Insert

**Resize in Editor:**
1. After inserting image, click on it
2. Hover over bottom-right corner
3. Drag handle to resize (minimum 100px width)
4. Image automatically updates

**Alignment:**
1. Insert image
2. Right-click or use toolbar alignment buttons
3. Choose Left, Center, or Right alignment

### Test YouTube Embeds

1. Click hamburger menu → Media → Embed Video
2. Paste YouTube URL (e.g., `https://www.youtube.com/watch?v=dQw4w9WgXcQ`)
3. Video embeds with responsive 16:9 aspect ratio
4. Black border matches neo-brutalist design

### Test Character Count

1. Type in document
2. Watch footer update in real-time
3. Shows: `X words • Y characters`
4. Also displays typography hint

### Test Focus Highlighting

1. Click into different blocks (paragraphs, headings, lists)
2. Active block gets yellow shadow outline
3. Helps track current editing position

### Test Navigation

**Gapcursor:**
1. Create a table
2. Try navigating to empty cells with arrow keys
3. You can now place cursor in empty cells

**Dropcursor:**
1. Drag text or content
2. Black 4px line shows where it will drop
3. Release to insert

## 📦 File Organization

### New Files Created

```
lib/services/imageUploadService.ts
├── validateImageFile()      - Check size/type limits
├── compressImage()           - Reduce to 1920px @ 85%
├── generateThumbnail()       - Create 300px previews
├── uploadToSupabase()        - Upload to storage
├── deleteFromSupabase()      - Cleanup old images
└── getImageMetadata()        - Retrieve image info

components/workspace/ImageUploadModal.tsx
├── Drag-drop zone (react-dropzone)
├── Crop tool (react-image-crop)
├── URL input mode
├── Upload progress indicator
└── Alt text editor

lib/tiptap/ResizableImage.ts
├── Custom Tiptap Image extension
├── Resize handles with drag support
├── Alignment attributes (left/center/right)
└── Width/height preservation
```

### Modified Files

```
components/workspace/DocEditor.tsx
├── Added 8 new Tiptap extensions
├── Replaced Image with ResizableImage
├── Updated toolbar with image/video buttons
├── Added character count footer
└── Custom CSS for all new features
```

## 🎨 Extension Architecture

### Active Tiptap Extensions (22 total)

**Core Editing:**
- StarterKit (includes: Paragraph, Heading, Bold, Italic, Strike, Code, Blockquote, BulletList, OrderedList, CodeBlock, HorizontalRule, HardBreak, History)
- Placeholder
- CharacterCount

**Formatting:**
- TextStyle
- Color
- Highlight
- Underline
- Subscript
- Superscript
- FontFamily
- TextAlign

**Structure:**
- Table (with TableRow, TableHeader, TableCell)
- TaskList (with TaskItem)
- Link

**Media:**
- ResizableImage (custom extension)
- Youtube

**Typography:**
- Typography (smart replacements)

**Navigation:**
- Focus
- Gapcursor
- Dropcursor

## ⌨️ Keyboard Shortcuts

### Standard Shortcuts
- `Cmd/Ctrl + B` - Bold
- `Cmd/Ctrl + I` - Italic
- `Cmd/Ctrl + U` - Underline
- `Cmd/Ctrl + K` - Open AI Assistant
- `Cmd/Ctrl + Z` - Undo
- `Cmd/Ctrl + Shift + Z` - Redo

### Typography Shortcuts (Auto-convert)
- Type `--` + space - Converts to em dash (—)
- Type `...` + space - Converts to ellipsis (…)
- Type `"text"` - Converts to smart quotes ("text")
- Type `(c)` + space - Converts to © symbol
- Type `(tm)` + space - Converts to ™ symbol
- Type `(r)` + space - Converts to ® symbol

### Navigation
- Arrow keys - Navigate with gapcursor support
- Click and drag - Visual dropcursor indicator

## 🔧 Troubleshooting

### Image Upload Fails

**Error: "File too large"**
- Maximum file size: 5MB
- Try compressing image before upload
- Or use URL import for large external images

**Error: "Invalid file type"**
- Only JPEG, PNG, WebP, GIF supported
- Convert other formats before uploading

**Error: "Upload failed"**
- Check Supabase storage bucket exists
- Verify RLS policies are active
- Check user is workspace member

### Typography Not Converting

- Ensure you press **space** or **Enter** after typing the pattern
- Works only in text blocks (not code blocks)
- Try: `--` [space] should convert immediately

### YouTube Not Embedding

- Must be valid YouTube URL format:
  - `https://www.youtube.com/watch?v=VIDEO_ID`
  - `https://youtu.be/VIDEO_ID`
- Check URL is pasted correctly in prompt

### Character Count Not Showing

- Counter appears below editor in footer
- Refresh page if not visible
- Works with all content types (text, tables, lists)

### Images Not Resizable

- Click image to select it first
- Hover over bottom-right corner for resize handle
- Drag handle to resize
- Minimum width: 100px

## 🎯 Best Practices

### Image Management
- ✅ Compress large images before upload (auto-compression helps but smaller is better)
- ✅ Use descriptive alt text for accessibility
- ✅ Choose appropriate alignment (center for featured images, left/right for inline)
- ✅ Delete unused images to save storage space

### Document Writing
- ✅ Use typography features for professional documents (em dashes, smart quotes)
- ✅ Embed videos sparingly (they can slow page load)
- ✅ Use character count to track document length
- ✅ Take advantage of focus highlighting for long documents

### Performance
- ✅ Limit images to necessary ones only
- ✅ Use WebP format when possible (best compression)
- ✅ Keep documents under 50 images for best performance
- ✅ Clear browser cache if editor feels slow

## 📊 Storage Costs

### Image Storage Structure
```
workspace-images/
├── {workspaceId}/
│   ├── {docId}/
│   │   ├── 1699891234567-x8k2p.jpg  (compressed to ~200KB)
│   │   ├── 1699891235892-m3n7q.png  (compressed to ~150KB)
│   │   └── ...
```

### Cost Optimization
- **Compression**: Images auto-compressed to max 1920px width @ 85% quality
- **Cleanup**: Delete unused images via `deleteFromSupabase(path)`
- **Monitoring**: Check Supabase dashboard for storage usage
- **Limits**: 5MB per file enforced at bucket level

## 🔐 Security

### RLS Policies
- ✅ Only workspace members can upload to their workspace
- ✅ Public read access (required for document sharing/viewing)
- ✅ Only workspace members can delete their images
- ✅ Files organized by workspaceId to prevent conflicts

### File Validation
- Client-side: Type and size checks before upload
- Server-side: Bucket enforces MIME types and size limits
- Path validation: workspaceId verified against user membership

## 🚀 Future Enhancements (Phase 2+)

### Planned Features
- [ ] Paste images from clipboard (Cmd+V with image)
- [ ] Export to PDF/Word/Markdown
- [ ] Document templates (Executive Summary, Product Brief, etc.)
- [ ] Image captions
- [ ] Image galleries/carousels
- [ ] Version history with image diff
- [ ] Collaborative cursor tracking
- [ ] Comments on images

### Under Consideration
- [ ] GIF/video upload support
- [ ] Image filters/effects
- [ ] OCR for image text extraction
- [ ] AI image generation integration
- [ ] Drag-to-reorder images
- [ ] Bulk image operations

## 📝 Version History

**Phase 1 - November 13, 2025**
- ✅ Drag-and-drop image upload
- ✅ Image crop and resize tools
- ✅ Resizable images in editor
- ✅ Typography enhancements (smart quotes, em dashes, symbols)
- ✅ Character/word counting
- ✅ Focus highlighting
- ✅ YouTube embeds
- ✅ Improved navigation (Gapcursor, Dropcursor)
- ✅ Supabase storage integration

## 🆘 Support

### Common Issues
- Storage bucket not found → Run `SETUP_STORAGE_BUCKET.sql`
- RLS policy errors → Verify user is workspace member
- Build errors → Clear node_modules and reinstall
- TypeScript errors → Check Tiptap extension imports use named exports

### Need Help?
- Check this guide first
- Review `SETUP_STORAGE_BUCKET.sql` for storage setup
- Check Supabase dashboard for storage/policy status
- Review browser console for detailed error messages

---

**Last Updated**: November 13, 2025  
**Phase**: 1.0 - Core Features Complete  
**Next Steps**: Test all features, then proceed to Phase 2 enhancements
