import http from 'http';

const register = (username, role) => {
    const data = JSON.stringify({ username, password: 'password123', role });
    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/register',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    const req = http.request(options, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => console.log(`${username} (${role}): ${res.statusCode} - ${body}`));
    });

    req.on('error', console.error);
    req.write(data);
    req.end();
};

register('student1', 'student');
register('agent1', 'agent');
