# Analytics Tracking Setup

This application now includes **Mixpanel** analytics tracking to monitor user activity and form usage.

## What's Being Tracked

### User Events (3 types)

1. **`user_logged_in`** - When a user successfully logs in
   - Properties: user_id, email, name, role

2. **`form_viewed`** - When a user opens any form page
   - Properties: form_type, user_id
   - Tracked forms: ee1, ee1a, ee3, ee10, en16, address-change, withdrawal, ir-notice, desert-pulm, invoice

3. **`pdf_generated`** - When a user successfully generates a PDF
   - Properties: form_type, user_id, client_id

## Setup Instructions

### 1. Create Mixpanel Account

1. Go to [https://mixpanel.com](https://mixpanel.com)
2. Sign up for a free account
3. Create a new project (e.g., "SWNA Tools")
4. Copy your **Project Token** from Project Settings

### 2. Add Environment Variable

**For Local Development:**

Add to `/web/.env.local`:
```env
NEXT_PUBLIC_MIXPANEL_TOKEN=your_mixpanel_token_here
```

**For Production (Vercel):**

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add:
   - **Key**: `NEXT_PUBLIC_MIXPANEL_TOKEN`
   - **Value**: Your Mixpanel project token
   - **Environments**: Production, Preview, Development

### 3. Deploy

Push your code to trigger a new deployment:
```bash
git add .
git commit -m "add mixpanel analytics tracking"
git push
```

## Viewing Analytics

### In Mixpanel Dashboard

1. **Events** → See all tracked events in real-time
2. **Users** → View individual user activity
3. **Insights** → Create custom reports

### Recommended Reports to Create

#### 1. Daily Active Users
- Metric: Unique `user_logged_in` events
- Breakdown: By day

#### 2. Form Usage Breakdown
- Metric: Count of `form_viewed` events
- Group by: `form_type` property
- Visualization: Pie chart

#### 3. PDF Generation by User
- Metric: Count of `pdf_generated` events
- Group by: `user_id` property
- Visualization: Bar chart

#### 4. Most Popular Forms
- Metric: Count of `pdf_generated` events
- Group by: `form_type` property
- Sorted: Descending

#### 5. User Activity Timeline
- Metric: Count of `pdf_generated` events
- Breakdown: By hour of day
- This shows peak usage times

## Privacy & Data

- **User Identification**: Users are identified by their email and user ID
- **Data Retention**: Free tier retains 1 year of data
- **No PII**: We don't track sensitive client information (SSN, DOB, etc.)
- **Client IDs**: Only Airtable client IDs are tracked (for form generation events)

## Cost

- **Free Tier**: 20M events/month (you'll use ~1,000/month)
- **Growth Tier**: $25/month if you exceed 20M events
- **Current Usage**: ~10 users × 5 forms/day × 20 work days = 1,000 events/month

You will stay on the **FREE tier indefinitely** with current usage.

## Troubleshooting

### Analytics Not Working?

1. **Check environment variable is set:**
   ```bash
   # In your browser console on the app
   console.log(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN ? 'Token set' : 'Token missing')
   ```

2. **Check browser console for errors:**
   - Open DevTools → Console tab
   - Look for `[Analytics]` log messages

3. **Verify Mixpanel initialization:**
   - You should see: `[Analytics] Mixpanel initialized` in console

4. **Check Mixpanel Live View:**
   - Go to Mixpanel → Events → Live View
   - Perform an action (e.g., view a form)
   - Event should appear within seconds

### Debugging Mode

Analytics runs in debug mode automatically in development. Check your browser console to see all tracked events.

## What Questions Can You Answer?

With this tracking setup, you can easily answer:

✅ **Who uses the app the most?**
- Users → Sorted by event count

✅ **Which forms are most popular?**
- Insights → `form_viewed` breakdown by `form_type`

✅ **Which forms are rarely used?**
- Same report, sorted ascending

✅ **What time of day is peak usage?**
- Insights → Events by hour

✅ **How many PDFs are generated per day/week/month?**
- Insights → `pdf_generated` count over time

✅ **Which user generates the most PDFs?**
- Insights → `pdf_generated` grouped by `user_id`

✅ **Are users viewing forms but not generating PDFs?** (form abandonment)
- Funnel: `form_viewed` → `pdf_generated`

## Next Steps (Optional)

If you want more advanced tracking in the future:

- **Session duration**: Track how long users spend in the app
- **Client search tracking**: Track which clients are accessed most
- **Error tracking**: Track form validation errors
- **Portal usage**: Track when users use the DOL portal helper
- **Form field completion**: Track which fields users fill out

For now, you have everything you need to understand usage patterns and identify improvement opportunities!
