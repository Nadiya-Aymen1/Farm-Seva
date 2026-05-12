const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = 8000;
const SECRET_KEY = 'farm_seva_secret_key_2026';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Initialize SQLite Database
const db = new sqlite3.Database('./farm_seva.db', (err) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('✅ Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    // Farmers table
    db.run(`
        CREATE TABLE IF NOT EXISTS farmers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE,
            phone TEXT UNIQUE NOT NULL,
            aadhaar TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            state TEXT,
            district TEXT,
            village TEXT,
            land_area REAL,
            crop_type TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Login sessions table
    db.run(`
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            farmer_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            FOREIGN KEY(farmer_id) REFERENCES farmers(id)
        )
    `);

    // Crop records table
    db.run(`
        CREATE TABLE IF NOT EXISTS crop_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            farmer_id INTEGER NOT NULL,
            crop_name TEXT NOT NULL,
            planting_date DATE,
            expected_harvest_date DATE,
            area_planted REAL,
            status TEXT DEFAULT 'active',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(farmer_id) REFERENCES farmers(id)
        )
    `);

    // Subsidy applications table
    db.run(`
        CREATE TABLE IF NOT EXISTS subsidy_applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            farmer_id INTEGER NOT NULL,
            subsidy_type TEXT NOT NULL,
            amount_applied REAL,
            status TEXT DEFAULT 'pending',
            application_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            approval_date DATETIME,
            FOREIGN KEY(farmer_id) REFERENCES farmers(id)
        )
    `);

    console.log('✅ Database tables initialized');
}

// Routes

// Register endpoint
app.post('/api/register', (req, res) => {
    const { name, phone, aadhaar, email, state, district, village, landArea, cropType, password } = req.body;

    if (!name || !phone || !aadhaar || !password) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error hashing password' });
        }

        const query = `
            INSERT INTO farmers (name, email, phone, aadhaar, password, state, district, village, land_area, crop_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.run(query, [name, email || null, phone, aadhaar, hashedPassword, state || null, district || null, village || null, landArea || null, cropType || null], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ success: false, message: 'Phone or Aadhaar already registered' });
                }
                return res.status(500).json({ success: false, message: 'Registration failed', error: err.message });
            }

            res.json({ success: true, message: 'Registration successful', farmerId: this.lastID });
        });
    });
});

// Login endpoint
app.post('/api/login', (req, res) => {
    const { phone, password } = req.body;

    if (!phone || !password) {
        return res.status(400).json({ success: false, message: 'Phone and password required' });
    }

    db.get('SELECT * FROM farmers WHERE phone = ?', [phone], (err, farmer) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (!farmer) {
            return res.status(401).json({ success: false, message: 'Invalid phone or password' });
        }

        bcrypt.compare(password, farmer.password, (err, isMatch) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error comparing passwords' });
            }

            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Invalid phone or password' });
            }

            // Create JWT token
            const token = jwt.sign({ farmerId: farmer.id, phone: farmer.phone }, SECRET_KEY, { expiresIn: '7d' });

            // Save session
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
            db.run(
                'INSERT INTO sessions (farmer_id, token, expires_at) VALUES (?, ?, ?)',
                [farmer.id, token, expiresAt]
            );

            res.json({
                success: true,
                message: 'Login successful',
                token,
                farmer: {
                    id: farmer.id,
                    name: farmer.name,
                    phone: farmer.phone,
                    email: farmer.email,
                    state: farmer.state,
                    district: farmer.district,
                    village: farmer.village,
                    landArea: farmer.land_area,
                    cropType: farmer.crop_type
                }
            });
        });
    });
});

// Get farmer profile
app.get('/api/farmer/profile', verifyToken, (req, res) => {
    const farmerId = req.farmerId;

    db.get('SELECT * FROM farmers WHERE id = ?', [farmerId], (err, farmer) => {
        if (err || !farmer) {
            return res.status(404).json({ success: false, message: 'Farmer not found' });
        }

        res.json({
            success: true,
            farmer: {
                id: farmer.id,
                name: farmer.name,
                phone: farmer.phone,
                email: farmer.email,
                aadhaar: farmer.aadhaar,
                state: farmer.state,
                district: farmer.district,
                village: farmer.village,
                landArea: farmer.land_area,
                cropType: farmer.crop_type,
                createdAt: farmer.created_at
            }
        });
    });
});

// Update farmer profile
app.put('/api/farmer/profile', verifyToken, (req, res) => {
    const farmerId = req.farmerId;
    const { name, email, state, district, village, landArea, cropType } = req.body;

    const query = `
        UPDATE farmers 
        SET name = ?, email = ?, state = ?, district = ?, village = ?, land_area = ?, crop_type = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;

    db.run(query, [name, email, state, district, village, landArea, cropType, farmerId], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Update failed', error: err.message });
        }

        res.json({ success: true, message: 'Profile updated successfully' });
    });
});

// Add crop record
app.post('/api/crops', verifyToken, (req, res) => {
    const farmerId = req.farmerId;
    const { cropName, plantingDate, expectedHarvestDate, areaPlanted, notes } = req.body;

    const query = `
        INSERT INTO crop_records (farmer_id, crop_name, planting_date, expected_harvest_date, area_planted, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [farmerId, cropName, plantingDate, expectedHarvestDate, areaPlanted, notes || null], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to add crop record' });
        }

        res.json({ success: true, message: 'Crop record added', cropId: this.lastID });
    });
});

// Get farmer's crops
app.get('/api/crops', verifyToken, (req, res) => {
    const farmerId = req.farmerId;

    db.all('SELECT * FROM crop_records WHERE farmer_id = ? ORDER BY created_at DESC', [farmerId], (err, crops) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to fetch crops' });
        }

        res.json({ success: true, crops: crops || [] });
    });
});

// Apply for subsidy
app.post('/api/subsidy/apply', verifyToken, (req, res) => {
    const farmerId = req.farmerId;
    const { subsidyType, amountApplied } = req.body;

    const query = `
        INSERT INTO subsidy_applications (farmer_id, subsidy_type, amount_applied)
        VALUES (?, ?, ?)
    `;

    db.run(query, [farmerId, subsidyType, amountApplied], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to apply for subsidy' });
        }

        res.json({ success: true, message: 'Subsidy application submitted', applicationId: this.lastID });
    });
});

// Get farmer's subsidy applications
app.get('/api/subsidy/applications', verifyToken, (req, res) => {
    const farmerId = req.farmerId;

    db.all('SELECT * FROM subsidy_applications WHERE farmer_id = ? ORDER BY application_date DESC', [farmerId], (err, applications) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to fetch applications' });
        }

        res.json({ success: true, applications: applications || [] });
    });
});

// Middleware to verify JWT token
function verifyToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).json({ success: false, message: 'Invalid or expired token' });
        }

        req.farmerId = decoded.farmerId;
        next();
    });
}

// Logout endpoint
app.post('/api/logout', verifyToken, (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    
    db.run('DELETE FROM sessions WHERE token = ?', [token], (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Logout failed' });
        }

        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🌾 Farm Seva Server running at http://localhost:${PORT}`);
    console.log(`📊 Database: farm_seva.db`);
});
