import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { requireAuth } from '@/lib/auth';

interface PortalRequest {
  case_id: string;
  last_name: string;
  ssn_last4: string;
  client_name?: string;
}

export async function POST(request: NextRequest) {
  let browser;

  try {
    await requireAuth();

    const { case_id, last_name, ssn_last4 }: PortalRequest = await request.json();

    // Validate required fields
    if (!case_id || !last_name || !ssn_last4) {
      return NextResponse.json(
        { error: 'Missing required fields: case_id, last_name, or ssn_last4' },
        { status: 400 }
      );
    }

    console.log(`Starting portal automation for case: ${case_id}`);

    // Launch browser
    browser = await chromium.launch({ 
      headless: false,  // Keep visible so user can see the process
      slowMo: 1000      // Slow down for better visibility
    });
    
    const page = await browser.newPage();
    
    // Navigate to DOL portal
    console.log('Navigating to DOL portal...');
    await page.goto('https://eclaimant.dol.gov/portal/?program_name=EN');

    // Wait for the main frame to load
    const mainframe = page.frameLocator('[name="mainframe"]');

    // Wait for and click the "Upload Document to Existing Case" button
    console.log('Looking for upload button...');
    await mainframe.locator('input.button-submit').first().waitFor({ state: 'visible' });

    // Find the correct upload button by its value
    const uploadButtons = await mainframe.locator('input.button-submit').all();
    let uploadButtonFound = false;

    for (const button of uploadButtons) {
      const value = await button.getAttribute('value');
      if (value === 'Upload Document to Existing Case') {
        console.log('Clicking upload document button...');
        await button.click();
        uploadButtonFound = true;
        break;
      }
    }

    if (!uploadButtonFound) {
      throw new Error('Upload Document button not found');
    }

    // Fill in the form fields
    console.log('Filling in case information...');
    await mainframe.locator('input#case_number').fill(case_id);
    await mainframe.locator('input#last_name').fill(last_name);
    await mainframe.locator('input#last_4_ssn').fill(ssn_last4);

    // Click Next button
    console.log('Clicking Next button...');
    await mainframe.locator('input#btnNext').click();

    // Wait for the next page to load
    await page.waitForLoadState('networkidle');

    // Pause for manual file upload
    console.log('Portal automation complete. Ready for manual file upload.');
    await page.pause();

    // Close browser after user interaction
    await browser.close();

    return NextResponse.json({ 
      success: true, 
      message: 'Portal automation completed successfully. File upload page ready.' 
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('Portal automation error:', error);

    // Make sure browser is closed even on error
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Portal automation failed',
        details: 'Check server logs for more information'
      },
      { status: 500 }
    );
  }
}