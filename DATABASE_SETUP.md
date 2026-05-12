# Farm Seva - Database Setup & Installation Guide

## Overview
Farm Seva is a comprehensive agricultural support platform with user authentication, farmer profile management, crop tracking, and subsidy application system.

## Database Structure

### Tables Created:

1. **farmers** - Stores farmer registration and profile data
   - id (PK), name, email, phone, aadhaar, password, state, district, village, land_area, crop_type, created_at, updated_at

2. **sessions** - Manages active login sessions
   - id (PK), farmer_id (FK), token, created_at, expires_at

3. **crop_records** - Tracks crops planted by each farmer
   - id (PK), farmer_id (FK), crop_name, planting_date, expected_harvest_date, area_planted, status, notes, created_at

4. **subsidy_applications** - Stores subsidy applications
   - id (PK), farmer_id (FK), subsidy_type, amount_applied, status, application_date, approval_date

## Installation & Setup

### Prerequisites
- Node.js (v14+)
- npm or yarn
- SQLite3 (included with sqlite3 npm package)

### Step 1: Install Dependencies
```bash
cd c:\Users\User\Desktop\Farm-Seva
npm install
```

### Step 2: Start the Server
```bash
npm start
```

The server will start at `http://localhost:8000`

### Step 3: Database Initialization
The database `farm_seva.db` will be automatically created on first server run with all tables initialized.

## API Endpoints

### Authentication
- **POST /api/register** - Register new farmer
- **POST /api/login** - Login with phone and password
- **POST /api/logout** - Logout (requires token)

### Farmer Profile
- **GET /api/farmer/profile** - Get farmer details (requires token)
- **PUT /api/farmer/profile** - Update farmer profile (requires token)

### Crop Management
- **POST /api/crops** - Add crop record (requires token)
- **GET /api/crops** - Get farmer's crops (requires token)

### Subsidy
- **POST /api/subsidy/apply** - Apply for subsidy (requires token)
- **GET /api/subsidy/applications** - Get subsidy applications (requires token)

## Data Stored in Database

### Registration Fields:
- Full Name
- Email (optional)
- Phone Number (unique)
- Aadhaar (unique)
- Password (hashed with bcryptjs)
- State
- District
- Village
- Land Area (in acres)
- Primary Crop Type

### Additional Features:
✅ Secure password hashing with bcryptjs
✅ JWT token-based authentication
✅ Session management
✅ Farmer profile persistence
✅ Crop tracking system
✅ Subsidy application tracking
✅ Data validation on all inputs

## Frontend Integration

### Login Flow:
1. User enters phone number and password
2. Frontend sends credentials to `/api/login`
3. Backend validates and returns JWT token
4. Token stored in localStorage
5. Token used in subsequent API calls

### Auto-login:
```javascript
const token = localStorage.getItem('token');
const user = localStorage.getItem('user');

if (token && user) {
    // User is logged in
    const userData = JSON.parse(user);
}
```

## Security Features

✅ Passwords hashed with bcryptjs (10 salt rounds)
✅ JWT tokens expire in 7 days
✅ CORS enabled for frontend access
✅ Input validation on all endpoints
✅ Unique constraints on phone and aadhaar
✅ SQL injection prevention via parameterized queries

## Database File Location
`c:\Users\User\Desktop\Farm-Seva\farm_seva.db`

## Troubleshooting

**Issue: Port 8000 already in use**
- Solution: Change PORT in server.js to a different port (e.g., 8001)

**Issue: CORS errors**
- Solution: Make sure API calls use `http://localhost:8000` exactly

**Issue: Database connection error**
- Solution: Ensure write permissions in the Farm-Seva folder

## Next Steps
1. Test registration with new user
2. Test login with registered credentials
3. Update dashboard.html to fetch and display farmer data from API
4. Implement crop tracking UI
5. Implement subsidy application UI
