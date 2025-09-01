require('@testing-library/jest-dom');
const { TextEncoder, TextDecoder } = require('util');

// Polyfill TextEncoder/TextDecoder for react-router-dom v6
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;