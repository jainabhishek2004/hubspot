import { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [token, setToken] = useState('9d9e342f9478836c02171cbcf68d0c7b');
  const [status, setStatus] = useState(0);
  const [addLeads, setAddLeads] = useState(false); 
  const[companyid, setCompanyId] = useState(''); 

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (status === 0) {
      return;
    }

    if (code) {
      // Step 1: Exchange code for access token
      axios.post('http://localhost:3001/api/exchange-code', { code })
        .then((res) => {
          console.log('✅ Tokens received:', res.data);
          const access_token = res.data.access_token;

        // Step 2: Fetch user info to get company_id
        axios.post('http://localhost:3001/api/fetch-user', { access_token })
          .then((userRes) => {
            const companyId = userRes.data.company_id;
            console.log("🏢 Company ID:", companyId);
            setCompanyId(companyId);
            console.log(companyid)
          })
          .catch((err) => {
            console.error('❌ Error fetching user info:', err);
          });
          
        })

        .catch((err) => {
          console.error('❌ Error exchanging code:', err);
        });
    }
  }, [status]);

  // ✅ Submit your IVR token to /api/verify-token
  const handleSubmit = async () => {
    try {
      const response = await axios.post(
        'http://localhost:3001/api/verify-token',
        { token } // include addLeads flag in request body
      );

      if (response.status === 200) {
        alert('IVR token verified!');
        setStatus(response.status);
        localStorage.setItem('ivr_token', token);
        setToken('');
      } else {
        alert('Invalid token or request failed.');
      }
    } catch (error) {
      console.error('❌ Error verifying IVR token:', error);
      alert('Invalid token or request failed.');
    }
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      background: "linear-gradient(to right, #f7f9fb, #e0e7ec)",
      fontFamily: "Segoe UI, Roboto, sans-serif"
    }}>
      <h1 style={{
        color: "#013D4D",
        fontSize: "2.5rem",
        marginBottom: "2rem",
        fontWeight: "600"
      }}>
        Welcome to IVR Solution
      </h1>

      <input
        type="text"
        placeholder="Enter IVR token"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        style={{
          padding: "0.75rem 1rem",
          fontSize: "1rem",
          borderRadius: "8px",
          border: "1px solid #ccc",
          marginBottom: "1rem",
          width: "280px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}
      />

      <label style={{ marginBottom: "1rem", fontSize: "1rem", color: "#013D4D" }}>
        <input
          type="checkbox"
          checked={addLeads}
          onChange={(e) => setAddLeads(e.target.checked)}
          style={{ marginRight: "0.5rem" }}
        />
        Do you want us to add leads to Pipedrive?
      </label>

      <button
        onClick={handleSubmit}
        style={{
          backgroundColor: "#013D4D",
          color: "#fff",
          padding: "0.75rem 1.5rem",
          fontSize: "1rem",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          transition: "background-color 0.3s ease"
        }}
        onMouseOver={(e) => e.target.style.backgroundColor = "#02556e"}
        onMouseOut={(e) => e.target.style.backgroundColor = "#013D4D"}
      >
        Verify IVR Token
      </button>
    </div>
  );
}

export default App;
