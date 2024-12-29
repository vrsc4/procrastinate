const express = require('express');
const path = require('path');
const dns = require('dns').promises;
const httpProxy = require('http-proxy');
const fs = require('fs').promises;

const app = express();
app.use(express.static(__dirname));
app.use(express.json());

// Enable CORS for all routes
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Store active VPN sessions
const activeSessions = new Map();
let blockedSites = new Set();

// Helper function to validate URL
async function validateUrl(url) {
    try {
        const urlString = url.startsWith('http') ? url : `http://${url}`;
        const parsedUrl = new URL(urlString);
        await dns.lookup(parsedUrl.hostname);
        return parsedUrl.hostname;
    } catch (error) {
        console.error('URL validation error:', error);
        return null;
    }
}

// Helper function to check if a host matches any blocked domain
function isHostBlocked(host) {
    if (!host || !blockedSites.size) return false;
    
    host = host.toLowerCase();
    for (const site of blockedSites) {
        // Remove any protocol and www
        const domain = site.toLowerCase().replace(/^https?:\/\//i, '').replace(/^www\./i, '');
        
        // Match exact domain or any subdomain
        if (host === domain || 
            host === 'www.' + domain ||
            host.endsWith('.' + domain)) {
            console.log(`Blocked access to ${host} (matches ${domain})`);
            return true;
        }
    }
    return false;
}

// Create proxy server
const proxy = httpProxy.createProxyServer({});

// Handle proxy errors
proxy.on('error', (err, req, res) => {
    console.error('Proxy error:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Proxy error');
});

// Middleware to handle blocked sites
app.use((req, res, next) => {
    const host = req.headers.host;
    if (isHostBlocked(host)) {
        res.writeHead(403, { 'Content-Type': 'text/html' });
        res.end(`
            <html>
                <head>
                    <title>Website Blocked</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            margin: 0;
                            background-color: #f5f5f5;
                        }
                        .blocked-message {
                            text-align: center;
                            padding: 2rem;
                            background: white;
                            border-radius: 8px;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        }
                        h1 { color: #d32f2f; }
                        p { color: #666; }
                    </style>
                </head>
                <body>
                    <div class="blocked-message">
                        <h1>Website Blocked</h1>
                        <p>This website has been blocked by ClockGain VPN to help you stay focused.</p>
                    </div>
                </body>
            </html>
        `);
    } else {
        next();
    }
});

// VPN connection endpoint
app.post('/api/vpn/connect', async (req, res) => {
    console.log('Received VPN connection request:', req.body);
    try {
        const { websites, duration } = req.body;
        
        if (!websites || !Array.isArray(websites) || websites.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Please provide at least one website'
            });
        }

        // Validate all websites
        const validatedSites = [];
        for (const site of websites) {
            const hostname = await validateUrl(site);
            if (hostname) {
                validatedSites.push(hostname);
                console.log('Validated website:', hostname);
            } else {
                console.log('Invalid website:', site);
            }
        }

        if (validatedSites.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid websites provided'
            });
        }

        // Create new VPN session
        const sessionId = Date.now().toString();
        const session = {
            id: sessionId,
            websites: validatedSites,
            startTime: Date.now(),
            duration: duration,
            active: true
        };

        console.log('Created new session:', session);

        // Add websites to blocked set
        validatedSites.forEach(site => blockedSites.add(site));
        console.log('Updated blocked sites:', blockedSites);

        // Store session
        activeSessions.set(sessionId, session);

        // Set timeout to cleanup session
        setTimeout(() => {
            console.log('Session timeout reached:', sessionId);
            const session = activeSessions.get(sessionId);
            if (session) {
                session.active = false;
                // Remove websites from blocked set
                session.websites.forEach(site => blockedSites.delete(site));
                activeSessions.delete(sessionId);
            }
        }, duration * 1000);

        res.json({
            success: true,
            sessionId,
            websites: validatedSites,
            message: 'VPN connected successfully'
        });
    } catch (error) {
        console.error('VPN connection error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error: ' + error.message
        });
    }
});

// Disconnect endpoint
app.post('/api/vpn/disconnect', async (req, res) => {
    try {
        const { sessionId } = req.body;
        const session = activeSessions.get(sessionId);
        
        if (session) {
            session.active = false;
            // Remove websites from blocked set
            session.websites.forEach(site => blockedSites.delete(site));
            activeSessions.delete(sessionId);
            
            res.json({
                success: true,
                message: 'VPN disconnected successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }
    } catch (error) {
        console.error('VPN disconnect error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Status endpoint
app.get('/api/vpn/status/:sessionId', (req, res) => {
    const session = activeSessions.get(req.params.sessionId);
    if (session) {
        const remainingTime = Math.max(0, session.duration - (Date.now() - session.startTime) / 1000);
        res.json({
            active: session.active,
            remainingTime,
            blockedWebsites: session.websites
        });
    } else {
        res.status(404).json({ error: 'Session not found' });
    }
});

// Health check endpoint
app.get('/api/vpn/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Handle all other requests through proxy
app.all('*', (req, res) => {
    const target = `http://${req.headers.host}`;
    proxy.web(req, res, { target });
});

const port = 3000;
const proxyPort = 8080;

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// Start proxy server
require('http').createServer((req, res) => {
    const host = req.headers.host;
    if (isHostBlocked(host)) {
        res.writeHead(403, { 'Content-Type': 'text/html' });
        res.end(`
            <html>
                <head>
                    <title>Website Blocked</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            margin: 0;
                            background-color: #f5f5f5;
                        }
                        .blocked-message {
                            text-align: center;
                            padding: 2rem;
                            background: white;
                            border-radius: 8px;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        }
                        h1 { color: #d32f2f; }
                        p { color: #666; }
                    </style>
                </head>
                <body>
                    <div class="blocked-message">
                        <h1>Website Blocked</h1>
                        <p>This website has been blocked by ClockGain VPN to help you stay focused.</p>
                    </div>
                </body>
            </html>
        `);
    } else {
        proxy.web(req, res, { target: `http://${host}` });
    }
}).listen(proxyPort, () => {
    console.log(`HTTP Proxy server running on port ${proxyPort}`);
});
