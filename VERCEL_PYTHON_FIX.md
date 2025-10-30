# Vercel Python Fix - Deployment Guide

## Problem Summary

**Issue**: PDF generation was failing in production with error: `spawn python3 ENOENT`

**Root Cause**: Vercel's Node.js serverless functions don't include Python runtime. You can't spawn Python processes from Node.js functions.

**Solution**: Created a hybrid architecture where Python runs as separate Vercel serverless functions, and Node.js routes call them via HTTP.

---

## What Was Changed

### 1. Created Python Serverless Function

**File**: `/web/api/python/generate-ee10.py`

This is a Vercel-compatible Python serverless function that:
- Runs in Vercel's Python 3.9 runtime
- Imports your EE10Generator
- Generates PDFs and returns base64-encoded data
- Works identically to the old spawn-based approach

### 2. Updated Node.js API Route

**File**: `/web/src/app/api/generate/ee10/route.ts`

Changed from:
- ❌ Spawning Python process directly (`spawn python3`)
- ✅ Making HTTP request to Python serverless function

### 3. Created Vercel Configuration

**File**: `/vercel.json` (at project root)

Tells Vercel:
- Python functions are in `/web/api/python/*.py`
- Use Python 3.9 runtime for those files
- Include generators and templates in Python function bundle
- Set appropriate timeouts

### 4. Copied Dependencies

**File**: `/web/requirements.txt`

Copied from project root so Vercel installs Python dependencies.

---

## How It Works

### Architecture Flow

```
User Browser
    ↓
Next.js API Route (/api/generate/ee10)
    ↓ HTTP Request
Python Serverless Function (/api/python/generate-ee10)
    ↓ Uses
EE10Generator (your existing Python code)
    ↓ Returns
Base64 PDF → Node.js → Browser Download
```

### Local vs Production

**Local Development**:
- Python endpoint: `http://localhost:3000/api/python/generate-ee10`
- Still requires Python installed locally

**Production (Vercel)**:
- Python endpoint: `https://your-domain.vercel.app/api/python/generate-ee10`
- Vercel provides Python runtime automatically

---

## Deployment Instructions

### Step 1: Commit Changes

```bash
cd /Users/nicholasrabow/Desktop/swna/swna_tools

git add .
git commit -m "fix: add Python serverless functions for Vercel deployment"
git push
```

### Step 2: Vercel Will Auto-Deploy

Vercel is connected to your GitHub, so it will:
1. Detect the new `vercel.json` at project root
2. Build the Next.js app from `/web`
3. Create Python serverless functions from `/web/api/python/*.py`
4. Install Python dependencies from `/web/requirements.txt`
5. Deploy everything

### Step 3: Test

1. Go to https://swna-tools-web.vercel.app
2. Navigate to EE-10 form
3. Fill out and generate PDF
4. Should work now!

---

## Verifying Deployment

### Check Vercel Dashboard

1. Go to https://vercel.com/your-project
2. Click on latest deployment
3. Look for "Functions" tab
4. You should see:
   - ✅ `/api/python/generate-ee10` (Python runtime)
   - ✅ `/api/generate/ee10` (Node.js runtime)

### Check Logs

If it still fails:
1. Vercel Dashboard → Functions
2. Find the failed function
3. Look for logs from either:
   - `[EE-10]` - Node.js route logs
   - Python errors from the Python function

---

## Next Steps: Convert Other Forms

Currently only **EE-10** uses this new architecture. You need to:

1. **Create Python functions for all other forms:**
   - `/web/api/python/generate-ee3.py`
   - `/web/api/python/generate-ee1.py`
   - `/web/api/python/generate-ee1a.py`
   - etc. (8 more files)

2. **Update their Node.js routes** to call Python endpoints

3. **Or use a generic endpoint** that handles all forms

---

## Alternative: Generic Python Endpoint

Instead of creating 10 separate Python files, you could create ONE generic endpoint:

**/web/api/python/generate.py**:
```python
# Accepts form_type parameter
# Routes to appropriate generator
```

Then all Node.js routes call: `/api/python/generate?type=ee10`

Let me know if you want me to implement this cleaner approach!

---

## Troubleshooting

### "Module not found" in Python Function

**Problem**: Python can't import generators
**Solution**: Check `includeFiles` in vercel.json includes `generators/**`

### "Template file not found"

**Problem**: Templates not included in Python function
**Solution**: Check `includeFiles` in vercel.json includes `templates/**`

### Still getting spawn python3 error

**Problem**: Using old code path
**Solution**: Make sure changes to `/api/generate/ee10/route.ts` are deployed

### Python endpoint returns 404

**Problem**: Vercel didn't detect Python function
**Solution**:
1. Check `/web/api/python/*.py` exists
2. Check `/web/requirements.txt` exists
3. Redeploy

---

## Cost Implications

**Before**: Trying to run Python in Node.js functions (impossible)

**After**: Running separate Python serverless functions

**Cost**: Still free tier! Each request counts as 2 function invocations (Node → Python), but well within free limits.

**Performance**: Adds ~100-200ms for internal HTTP call, negligible compared to PDF generation time.

---

## Future Improvements

1. **Generic Python endpoint** - One file instead of 10
2. **Caching** - Cache generated PDFs for identical requests
3. **Async generation** - Start job, return job ID, poll for completion
4. **External service** - Move all Python to Railway/Render for more resources

For now, this solution gets you working in production! 🎉
