import axios from 'axios';

const API_URL = 'http://localhost:3002/api';

// Funkcja pomocnicza do czekania
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test login limiter
async function testLoginLimiter() {
  console.log('\n🔒 Testowanie limitera logowania...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  for (let i = 1; i <= 6; i++) {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: 'test@test.com',
        password: 'wrongpassword'
      });
      console.log(`✅ Próba ${i}: Logowanie udane (nie powinno się zdarzyć)`);
    } catch (error) {
      if (error.response) {
        console.log(`❌ Próba ${i}: ${error.response.data.message}`);
      } else {
        console.log(`❌ Próba ${i}: ${error.message}`);
      }
    }
    await sleep(1000); // Czekaj 1 sekundę między próbami
  }
}

// Test register limiter
async function testRegisterLimiter() {
  console.log('\n📝 Testowanie limitera rejestracji...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  for (let i = 1; i <= 4; i++) {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        email: `test${i}@test.com`,
        password: 'password123',
        name: `Test User ${i}`
      });
      console.log(`✅ Próba ${i}: Rejestracja udana`);
    } catch (error) {
      if (error.response) {
        console.log(`❌ Próba ${i}: ${error.response.data.message}`);
      } else {
        console.log(`❌ Próba ${i}: ${error.message}`);
      }
    }
    await sleep(1000);
  }
}

// Test API limiter
async function testApiLimiter() {
  console.log('\n🌐 Testowanie limitera API...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  for (let i = 1; i <= 101; i++) {
    try {
      const response = await axios.get(`${API_URL}/health`);
      console.log(`✅ Request ${i}: ${response.data.status}`);
    } catch (error) {
      if (error.response) {
        console.log(`❌ Request ${i}: ${error.response.data.message}`);
      } else {
        console.log(`❌ Request ${i}: ${error.message}`);
      }
    }
    await sleep(50); // Czekaj 50ms między requestami
  }
}

// Uruchom wszystkie testy
async function runTests() {
  console.log('🚀 Rozpoczynam testy rate limiterów...');
  
  // Test login limiter
  await testLoginLimiter();
  
  // Poczekaj 2 sekundy przed następnym testem
  await sleep(2000);
  
  // Test register limiter
  await testRegisterLimiter();
  
  // Poczekaj 2 sekundy przed następnym testem
  await sleep(2000);
  
  // Test API limiter
  await testApiLimiter();
  
  console.log('\n✨ Testy zakończone!');
}

// Uruchom testy
runTests().catch(console.error); 