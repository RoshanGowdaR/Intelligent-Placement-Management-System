# Intelligent Placement Management System — Test Documentation

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run a specific test file
npx vitest run src/test/TestScoring.test.ts
```

## Test Files Overview

| Test File | Feature | Description |
|-----------|---------|-------------|
| `example.test.ts` | Setup verification | Basic sanity check that test framework works |
| `Utils.test.ts` | Utility functions | Tests `cn()` class name merging utility |
| `ThemeToggle.test.tsx` | Theme switching | Verifies dark/light mode toggle renders and toggles theme |
| `ProtectedRoute.test.tsx` | Route protection | Tests auth-based route guards: loading, redirect, role checks |
| `EligibilityChecker.test.ts` | Company eligibility | Tests CGPA, year, and skills matching logic |
| `TestScoring.test.ts` | Test scoring engine | Tests score calculation, pass/fail, subject-wise breakdown |
| `AntiCheat.test.ts` | Anti-cheat system | Tests question shuffling, tab switch detection, fullscreen lockdown |
| `SessionTimeout.test.ts` | Admin session timeout | Tests localStorage state management and session expiry detection |
| `Navigation.test.tsx` | Routing structure | Verifies admin/student route path definitions |

## Feature Testing Steps

### 1. Theme Toggle (Light/Dark Mode)
1. Open the landing page
2. Click the sun/moon icon in the navigation bar
3. **Verify**: Page switches between light and dark themes
4. **Verify**: Theme persists after page reload
5. **Verify**: All pages (login, signup, dashboard) respect the selected theme

### 2. Authentication
1. Navigate to `/signup`
2. Fill in name, email, and password
3. **Verify**: Success message appears asking for email verification
4. Check email and click verification link
5. Navigate to `/login` and sign in
6. **Verify**: Redirected to `/dashboard` (student) or `/admin` (admin)
7. **Verify**: Admin accounts with 2FA are prompted for MFA code after login

### 3. Google OAuth Sign-In
1. Navigate to `/login`
2. Click "Sign in with Google"
3. Complete Google authentication
4. **Verify**: Redirected to appropriate dashboard based on role
5. **Verify**: Admin accounts are still prompted for 2FA after Google sign-in

### 4. Protected Routes
1. Without logging in, navigate to `/admin` or `/dashboard`
2. **Verify**: Redirected to `/login`
3. Log in as a student and try to access `/admin`
4. **Verify**: Redirected to `/dashboard`
5. Log in as admin and try to access `/dashboard`
6. **Verify**: Redirected to `/admin`

### 5. Company Eligibility Checker
1. As a student, navigate to `/dashboard/companies`
2. **Verify**: Companies show eligible/ineligible badges
3. **Verify**: Eligibility reasons are displayed (CGPA, skills, year)
4. Update profile CGPA and refresh
5. **Verify**: Eligibility status updates accordingly

### 6. Test Taking & Fullscreen Lockdown
1. As a student, go to `/dashboard/tests`
2. Click "Start Test" on an available test
3. **Verify**: Browser enters fullscreen mode
4. **Verify**: Copy/paste and right-click are disabled
5. **Verify**: Pressing Escape shows warning and re-enters fullscreen
6. Exit fullscreen twice
7. **Verify**: Test is auto-submitted after second violation
8. Complete a test normally
9. **Verify**: Score, subject-wise breakdown, and AI feedback are shown
10. **Verify**: Browser exits fullscreen after submission

### 7. Anti-Cheat Measures
1. Start a test
2. Switch to another tab (Alt+Tab or click another window)
3. **Verify**: Warning toast appears on first tab switch
4. Switch tabs again
5. **Verify**: Test is auto-submitted
6. **Verify**: Tab switch count is recorded in attempt data

### 8. Test Scoring & Review
1. Complete a test with some correct and some incorrect answers
2. **Verify**: Score percentage is displayed correctly
3. Click "Review Answers"
4. **Verify**: Wrong answers show the correct answer and AI explanation
5. **Verify**: Correct answers are highlighted in green

### 9. Admin Dashboard
1. Log in as admin
2. **Verify**: Dashboard shows overview stats
3. Navigate to Companies → Add a new company
4. **Verify**: Company appears in the list
5. Navigate to Tests → Create a new test
6. **Verify**: AI question generation and PDF extraction work
7. Navigate to Students → View student profiles
8. **Verify**: Student data is displayed correctly

### 10. Notifications
1. As admin, create a new test or company
2. Switch to a student account
3. **Verify**: Bell icon shows unread notification count
4. Click the bell icon
5. **Verify**: Notification message appears with correct details
6. Mark notifications as read
7. **Verify**: Unread count updates

### 11. Student Profile
1. Navigate to `/dashboard/profile`
2. Fill in personal details (USN, branch, CGPA, etc.)
3. Upload a resume
4. **Verify**: Profile completion percentage updates
5. Upload marks cards
6. **Verify**: OCR verification processes the image

### 12. Password Reset
1. Navigate to `/forgot-password`
2. Enter a registered email
3. **Verify**: OTP email is sent
4. Enter the OTP code
5. **Verify**: Redirected to reset password page
6. Set a new password
7. **Verify**: Can log in with the new password

### 13. Admin Session Timeout
1. Log in as admin
2. Leave the session idle for 55 minutes
3. **Verify**: Warning toast appears about imminent timeout
4. Continue being idle
5. **Verify**: Auto-logged out after 1 hour
6. **Verify**: Last route is saved for session restoration

### 14. Admin 2FA (TOTP)
1. Log in as admin
2. Navigate to Settings → Security
3. Enable 2FA / TOTP
4. **Verify**: QR code is displayed for authenticator app
5. Enter the TOTP code
6. **Verify**: 2FA is enabled
7. Log out and log back in
8. **Verify**: Prompted for TOTP code after password entry
