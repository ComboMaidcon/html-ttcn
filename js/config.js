/* ══════════════════════════════════════
   NOX Frontend — API Configuration
   ══════════════════════════════════════
   Đổi API_URL thành URL Railway sau khi deploy backend.
   Để trống ('') = dùng localStorage (chế độ offline).
*/
const API_URL = 'http://localhost:3000'; // vd: 'https://nox-backend.up.railway.app'

// Tự detect: nếu API_URL rỗng → dùng localStorage
const USE_API = API_URL.trim().length > 0;
