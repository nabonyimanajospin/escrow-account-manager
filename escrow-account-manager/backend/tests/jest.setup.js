// Ensure JWT_SECRET is set before any test module loads
process.env.JWT_SECRET = 'test_secret';
process.env.NODE_ENV = 'test';
