const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const contestRoutes = require('./routes/contests');
const syncRoutes = require('./routes/sync');
const problemRoutes = require('./routes/problems');
const profileRoutes = require('./routes/profile');
const botRoutes = require('./routes/bot');
const companiesRoutes = require('./routes/companies');
const onboardingRoutes = require('./routes/onboarding');
const userRoutes = require('./routes/user');
const extensionsRoutes = require('./routes/extensions');

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

const corsOptions = {
    origin: function (origin, callback) {
        
        if (!origin) return callback(null, true);
        
        
        if (origin.startsWith('chrome-extension://')) {
            return callback(null, true);
        }
        
        const allowedOrigins = [
            process.env.FRONTEND_URL || 'http://localhost:5000',
            'http://localhost:5000', 
            process.env.FRONTEND_URL_NEXT,
            'http://localhost:3000'
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};


app.use(cors(corsOptions));
app.use(express.json());


app.get('/', (req, res) => {
    res.json({ 
        message: 'LeetWars API is running...',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            contests: '/api/contests',
            sync: '/api/sync',
            problems: '/api/problems',
            profile: '/api/profile',
            bot: '/api/bot',
            companies: '/api/companies',
            onboarding: '/api/onboarding',
            user: '/api/user',
            extensions: '/api/extensions'
        }
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/user', userRoutes);
app.use('/api/extensions', extensionsRoutes);

app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
