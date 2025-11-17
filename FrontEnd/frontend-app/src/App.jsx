import { useState, useEffect } from 'react';

// API'den veri çeken ve gönderen Ana Bileşen
function App() {
  // Kullanıcı listesini tutmak için state
  const [users, setUsers] = useState([]);
  // Yeni kullanıcı adı için state
  const [newUserName, setNewUserName] = useState('');
  // Loading (Yükleniyor) durumu
  const [loading, setLoading] = useState(true);
  // Hata mesajı
  const [error, setError] = useState(null);

  // Veritabanından kullanıcıları çekme fonksiyonu
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      // ⭐️ NOT: Proxy sayesinde burası /users yerine /api/users olarak çalışır
      const response = await fetch('/api/users'); 
      if (!response.ok) {
        throw new Error('Kullanıcı listesi alınamadı.');
      }
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError('Kullanıcılar yüklenirken bir sorun oluştu. API kapalı olabilir.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Yeni kullanıcı ekleme fonksiyonu
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newUserName.trim()) return; // Boş isim engelleme

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newUserName.trim() }),
      });

      if (!response.ok) {
        throw new Error('Kullanıcı eklenirken hata oluştu.');
      }
      
      // Başarılıysa listeyi yeniden çek ve formu temizle
      setNewUserName('');
      fetchUsers(); 
      
    } catch (err) {
      setError(`Kullanıcı eklenemedi: ${err.message}`);
    }
  };

  // Bileşen ilk yüklendiğinde kullanıcıları bir kez çek
  useEffect(() => {
    fetchUsers();
  }, []); // Boş dizi, sadece başlangıçta çalışacağını belirtir

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <h1>Go API Kullanıcı Yönetimi</h1>
      <p>Go API'si şu anda <strong>http://localhost:8080</strong> adresinde çalışmalıdır.</p>
      
      {error && <p style={{ color: 'red', border: '1px solid red', padding: '10px' }}>Hata: {error}</p>}

      {/* Kullanıcı Ekleme Formu */}
      <div style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '30px' }}>
        <h2>➕ Yeni Kullanıcı Ekle</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            placeholder="Kullanıcı Adı"
            style={{ padding: '8px', marginRight: '10px', width: '200px' }}
          />
          <button type="submit" style={{ padding: '8px 15px' }}>
            Ekle
          </button>
        </form>
      </div>

      {/* Kullanıcı Listesi */}
      <h2>👥 Mevcut Kullanıcılar</h2>
      {loading && !users.length ? (
        <p>Yükleniyor...</p>
      ) : (
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {users.map((user) => (
            <li 
              key={user.id} 
              style={{ padding: '10px', borderBottom: '1px solid #eee' }}
            >
              <strong>ID: {user.id}</strong> - {user.name}
            </li>
          ))}
        </ul>
      )}
      {!loading && users.length === 0 && !error && <p>Henüz hiç kullanıcı eklenmemiş.</p>}
    </div>
  );
}

export default App;