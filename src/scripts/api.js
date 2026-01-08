import axios from 'axios';

const api = axios.create({
    baseURL: 'http://subetly-app.local/index.php/',
    headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    }
});

export default api;
