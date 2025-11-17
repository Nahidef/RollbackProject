import http from 'k6/http'; // ⭐️ DÜZELTME: http modülü artık doğru import edildi
import { check, sleep } from 'k6';

// 1. AYARLAR (Options)
// 5 Sanal Kullanıcı (VUs) 10 saniye boyunca yük oluşturacak
export const options = {
  vus: 5,
  duration: '10s',
  
  // Eğer hata oranı %1'in üzerine çıkarsa test BAŞARISIZ olsun (Rollback kriteri)
  thresholds: {
    'http_req_failed': ['rate<0.01'], 
    'http_req_duration': ['p(95)<300'], // Gecikme %95'ten az olmalı
  },
};

// 2. ANA İŞLEV (Main Function)
export default function () {
  const url = 'http://localhost:8080/users';

  // YAZMA İŞLEMİ (POST) - Master DB'ye gider
  const payload = JSON.stringify({ name: 'k6-test-user' });
  const params = { headers: { 'Content-Type': 'application/json' } };
  
  // POST artık çalışacaktır
  const postRes = http.post(url, payload, params); 
  
  check(postRes, {
    'POST - Basarili (HTTP 201)': (r) => r.status === 201,
  });
  
  // OKUMA İŞLEMİ (GET) - Replica DB'ye gider
  const getRes = http.get(url);
  
  check(getRes, {
    'GET - Basarili (HTTP 200)': (r) => r.status === 200,
    // Veritabanında veri olup olmadığını kontrol et
    'GET - Veri Var': (r) => r.json().length > 0,
  });

  sleep(1); 
}