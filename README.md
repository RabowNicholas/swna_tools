# SWNA Tools

A web application for generating legal forms and documents for Southwest Neurology Associates. The application provides an intuitive interface for creating various medical-legal forms, DOL correspondence, and referral letters.

## Overview

SWNA Tools is built with:
- **Frontend**: Next.js 15 with TypeScript and Tailwind CSS
- **Backend**: Python generators for PDF creation
- **Data**: Airtable integration for client and case management
- **Email**: Automated email delivery via Resend

## Project Structure

```
swna_tools/
├── web/                    # Next.js frontend application
│   ├── src/
│   │   ├── app/           # Next.js app router pages
│   │   ├── components/    # React components
│   │   └── lib/           # Utilities and helpers
│   └── api/               # API routes
├── generators/            # Python PDF generators
├── scripts/              # Python wrapper scripts
├── services/             # Airtable and email services
├── templates/            # PDF form templates
└── tests/                # Test files

```

## Setup Instructions

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm or pnpm

### Python Environment Setup

1. Create and activate virtual environment:
```bash
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

### Next.js Setup

1. Navigate to the web directory:
```bash
cd web
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.local.example .env.local
```

4. Configure environment variables in `.env.local`:
```
AIRTABLE_API_KEY=your_key_here
AIRTABLE_BASE_ID=your_base_id
RESEND_API_KEY=your_resend_key
```

### Running the Application

#### Development Mode

Start the Next.js development server:
```bash
cd web
npm run dev
```

The application will be available at `http://localhost:3000`

#### Production Build

```bash
cd web
npm run build
npm start
```

## Available Forms

The application supports generation of the following forms:

- **EE-1A**: Initial Medical Report
- **EE-3**: Medical Progress Report
- **EE-10**: Attending Physician's Statement
- **EN-16**: Medical Records Request
- **Address Change**: Notification form
- **IR Notice**: Independent Review notice
- **Desert Pulmonary**: Referral letter
- **DOL Letters**: Department of Labor correspondence

## Architecture

### Migration from Streamlit to Next.js

This project was migrated from Streamlit to Next.js. See [MIGRATION_COMPLETE.md](MIGRATION_COMPLETE.md) for details on the migration process.

### PDF Generation Flow

1. User fills out form in Next.js frontend
2. Form data submitted to Next.js API route
3. API spawns Python wrapper script
4. Python generator creates PDF from template
5. PDF emailed via Resend and/or uploaded to Airtable
6. Success response returned to frontend

### Deployment

The application is deployed on Vercel. See [VERCEL_PYTHON_FIX.md](VERCEL_PYTHON_FIX.md) for deployment configuration details.

## Development Workflow

1. Make changes to Next.js components in `web/src/`
2. Update Python generators in `generators/` if needed
3. Test locally with `npm run dev`
4. Run tests with `pytest` (Python) or `npm test` (Next.js)
5. Commit changes and push to trigger Vercel deployment

## Testing

### Python Tests

```bash
pytest tests/
```

### Frontend Tests

```bash
cd web
npm test
```

## Additional Documentation

- [Migration Guide](MIGRATION_COMPLETE.md) - Streamlit to Next.js migration details
- [Deployment Guide](VERCEL_PYTHON_FIX.md) - Vercel deployment configuration
- [Coordinate Helper](scripts/coordinate_helper.py) - Tool for PDF field positioning

## macOS App Compilation (Legacy)

To compile as a standalone macOS app:
```bash
python3 setup.py py2app
```

Note: This was used for the Streamlit version and may need updates for Next.js.

## Support

For issues or questions, contact the development team.
