import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
  try {
    console.log('[API] Processing signature request...');
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const maxWidth = parseInt(formData.get('maxWidth') as string) || 200;
    const maxHeight = parseInt(formData.get('maxHeight') as string) || 50;

    console.log('[API] File received:', file?.name, file?.type, file?.size);
    console.log('[API] Target dimensions:', maxWidth, 'x', maxHeight);

    if (!file) {
      console.error('[API] No file provided');
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process with Sharp (high quality)
    const image = sharp(buffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      return NextResponse.json(
        { error: 'Could not read image dimensions' },
        { status: 400 }
      );
    }

    // Find bounding box by detecting dark pixels
    const rawImageData = await image
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data, info } = rawImageData;
    const threshold = 240;
    let minX = info.width;
    let maxX = 0;
    let minY = info.height;
    let maxY = 0;

    // Scan pixels to find signature bounds
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const idx = (y * info.width + x) * info.channels;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // If pixel is dark (signature content)
        if (r < threshold || g < threshold || b < threshold) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }

    // Add padding
    const padding = 10;
    minX = Math.max(0, minX - padding);
    maxX = Math.min(info.width - 1, maxX + padding);
    minY = Math.max(0, minY - padding);
    maxY = Math.min(info.height - 1, maxY + padding);

    const contentWidth = maxX - minX + 1;
    const contentHeight = maxY - minY + 1;

    // Calculate final dimensions
    const aspectRatio = contentWidth / contentHeight;
    let finalWidth = contentWidth;
    let finalHeight = contentHeight;

    if (contentWidth > maxWidth || contentHeight > maxHeight) {
      if (aspectRatio > maxWidth / maxHeight) {
        finalWidth = maxWidth;
        finalHeight = Math.round(maxWidth / aspectRatio);
      } else {
        finalHeight = maxHeight;
        finalWidth = Math.round(maxHeight * aspectRatio);
      }
    }

    // Crop and resize with Sharp (high quality)
    const processedBuffer = await sharp(buffer)
      .extract({ left: minX, top: minY, width: contentWidth, height: contentHeight })
      .resize(finalWidth, finalHeight, {
        kernel: sharp.kernel.lanczos3,
        fit: 'fill',
      })
      .png({ quality: 100, compressionLevel: 0 })
      .toBuffer();

    // Return as base64
    const base64 = processedBuffer.toString('base64');

    console.log('[API] Processing complete! Final dimensions:', finalWidth, 'x', finalHeight);
    console.log('[API] Base64 length:', base64.length);

    return NextResponse.json({
      success: true,
      image: base64,
      width: finalWidth,
      height: finalHeight,
    });
  } catch (error) {
    console.error('[API] Signature processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process signature image', details: String(error) },
      { status: 500 }
    );
  }
}
