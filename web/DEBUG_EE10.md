# EE-10 Generation Debugging Guide

## What Was Added

Comprehensive error logging has been added throughout the EE-10 generation pipeline to help identify production failures.

## Files Modified

1. **`/src/app/api/generate/ee10/route.ts`** - API route with detailed logging
2. **`/scripts/ee10_wrapper.py`** - Python wrapper with verbose execution logs
3. **`/lib/generator-utils.ts`** - Real-time stderr capture and logging

## How to Debug in Production

### Step 1: Deploy Changes

```bash
git add .
git commit -m "add comprehensive error logging for EE-10 debugging"
git push
```

### Step 2: Trigger the Error

1. Go to your production site: https://swna-tools-web.vercel.app
2. Navigate to the EE-10 form
3. Fill out the form and try to generate a PDF (especially with "La Plata" doctor)
4. Note the exact error message shown to the user

### Step 3: Check Vercel Logs

**Option A: Via Vercel Dashboard**
1. Go to https://vercel.com/your-project
2. Click "Functions" tab
3. Find the failed function execution
4. Look for logs with `[EE-10]` prefix

**Option B: Via Vercel CLI**
```bash
vercel logs --follow
```

## What You'll See in Logs

### Successful Execution (for comparison)
```
[EE-10] Request started at 2025-01-29T...
[EE-10] Request size: 2847 bytes
[EE-10] Doctor: La Plata
[EE-10] Client ID: Doe, John - 1234
[EE-10] Starting Python generator execution...
[Generator] Starting ee10_wrapper.py execution
[Generator] Script path: /var/task/scripts/ee10_wrapper.py
[Generator] Sending 2847 bytes to Python process
[Generator] Python stderr: [EE-10 Wrapper] Starting execution
[Generator] Python stderr: [EE-10 Wrapper] Received input size: 2847 bytes
[Generator] Python stderr: [EE-10 Wrapper] Doctor selection: La Plata
[Generator] Python stderr: [EE-10 Wrapper] Client: Doe, John - 1234
[Generator] Python stderr: [EE-10 Wrapper] Instantiating EE10Generator
[Generator] Python stderr: [EE-10 Wrapper] Starting PDF generation...
[Generator] Python stderr: [EE-10 Wrapper] PDF generated successfully: EE10_J.Doe_01.29.2025.pdf, size: 1234567 bytes
[Generator] Process closed with code 0 after 3456ms
[EE-10] Generator execution completed in 3456 ms
[EE-10] PDF generated successfully, size: 1234567 bytes
[EE-10] Total execution time: 3456 ms
```

### Failed Execution (what to look for)

#### Scenario 1: Template Loading Failure
```
[Generator] Python stderr: [EE-10 Wrapper] Starting execution
[Generator] Python stderr: [EE-10 Wrapper] Doctor selection: La Plata
[Generator] Python stderr: [EE-10 Wrapper] Instantiating EE10Generator
[Generator] Python stderr: [EE-10 Wrapper] ERROR: [Errno 2] No such file or directory: 'templates/EE-10_la_plata.pdf'
[Generator] Python stderr: Stack trace:...
```
**Problem**: Template file not found in production

#### Scenario 2: Memory/Timeout Issue
```
[EE-10] Starting Python generator execution...
[Generator] Python stderr: [EE-10 Wrapper] Starting execution
[Generator] Python stderr: [EE-10 Wrapper] Starting PDF generation...
[No further logs - timeout]
```
**Problem**: Function timeout (30 seconds) or memory limit exceeded

#### Scenario 3: PDF Processing Error
```
[Generator] Python stderr: [EE-10 Wrapper] Starting PDF generation...
[Generator] Python stderr: [EE-10 Wrapper] ERROR: PdfReadError: EOF marker not found
[Generator] Python stderr: Stack trace:...
```
**Problem**: Corrupted template or PyPDF2 parsing error

#### Scenario 4: Python Dependency Missing
```
[Generator] Python stderr: ModuleNotFoundError: No module named 'PyPDF2'
```
**Problem**: Python dependencies not installed in production environment

## Common Issues & Solutions

### Issue: Large Template Timeout

**Symptoms:**
- Works locally but times out in production
- Last log shows "Starting PDF generation..." then nothing

**Solution:**
1. Check template file size: `ls -lh templates/EE-10_*.pdf`
2. If La Plata template is over 1 MB, optimize it:
   ```bash
   # Install Ghostscript if needed
   brew install ghostscript  # macOS

   # Optimize PDF
   gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook \
      -dNOPAUSE -dQUIET -dBATCH \
      -sOutputFile=EE-10_la_plata_optimized.pdf \
      templates/EE-10_la_plata.pdf

   # Replace original
   mv EE-10_la_plata_optimized.pdf templates/EE-10_la_plata.pdf
   ```

### Issue: Template Not Found

**Symptoms:**
```
FileNotFoundError: [Errno 2] No such file or directory: 'templates/EE-10_la_plata.pdf'
```

**Solution:**
1. Verify template exists in repo: `ls templates/EE-10_*.pdf`
2. Check .gitignore doesn't exclude templates
3. Ensure templates are committed and pushed

### Issue: Module Not Found

**Symptoms:**
```
ModuleNotFoundError: No module named 'PyPDF2'
```

**Solution:**
1. Check `requirements.txt` exists in project root
2. Verify dependencies are listed:
   ```
   PyPDF2==3.0.1
   reportlab==4.2.2
   python-dateutil==2.9.0.post0
   ```
3. Redeploy

### Issue: Memory Limit Exceeded

**Symptoms:**
- Function dies silently mid-execution
- No error message, just stops

**Solution:**
1. Optimize PDF templates (reduce file size)
2. Upgrade Vercel plan for more memory
3. Consider moving generators to separate service

## Quick Checklist

When debugging EE-10 failures:

- [ ] Check execution time in logs (timeout is 30 seconds)
- [ ] Look for "Starting PDF generation..." - does it get past this?
- [ ] Check template file being used (La Plata vs Lewis)
- [ ] Verify all Python stderr logs are present
- [ ] Look for stack traces in error logs
- [ ] Compare with working form (EE-3) logs
- [ ] Check template file size: `ls -lh templates/EE-10_*.pdf`

## Next Steps After Identifying Issue

1. **If timeout/memory:** Optimize La Plata template (reduce from 2.1 MB to under 500 KB)
2. **If file not found:** Verify templates are in git and deployed
3. **If module error:** Fix requirements.txt and redeploy
4. **If unknown:** Share full log output for further analysis

## Testing Locally vs Production

### Local Test:
```bash
cd web
npm run dev
# Try generating EE-10 with both doctor options
```

### Production Test:
```bash
# Monitor logs while testing
vercel logs --follow

# In another terminal, test the production site
# Navigate to EE-10 form and generate PDF
```

## Expected Performance

- **EE-10 (Lewis)**: ~2-4 seconds (481 KB template)
- **EE-10 (La Plata)**: ~5-15 seconds (2.1 MB template) - **May timeout!**
- **EE-3**: ~3-5 seconds (1.4 MB template)
- **EE-1**: ~1-2 seconds (71 KB template)

If EE-10 La Plata takes over 20 seconds locally, it will almost certainly timeout in production.
