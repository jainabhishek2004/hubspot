const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config(); // Load .env variables

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
// 🟢 Health check
app.get('/person-action-modal', async (req, res) => {
  try {
    // Extract query parameters sent by Pipedrive
    const { 
      selectedIds, 
      resource, 
      view, 
      userId, 
      companyId, 
      token 
    } = req.query;

    // Verify JWT token
    
    
    // selectedIds contains the person ID(s) selected by user
    const personIds = selectedIds ? selectedIds.split(',') : [];
    console.log('Selected Person IDs:', personIds);
    if (personIds.length === 0) {
      return res.status(400).json({
        error: { message: "No person selected" }
      });
    }


    
    
    // Return schema with person data populated
    res.json({
      data: {
        blocks: {
          person_name: {
            value: `**Name:** ${personData.name || 'N/A'}`,
          },
          person_email: {
            value: `**Email:** ${personData.email?.[0]?.value || 'N/A'}`,
          },
          person_phone: {
            value: `**Phone:** ${personData.phone?.[0]?.value || 'N/A'}`,
          },
          person_organization: {
            value: `**Organization:** ${personData.org_name || 'N/A'}`,
          },
          // Set default action if needed
          action_selection: {
            value: null // or set a default
          }
        },
        actions: {}
      }
    });

  } catch (error) {
    console.error('Error handling modal request:', error);
    res.status(500).json({
      error: { message: "Failed to load person data" }
    });
  }
})

app.post('/api/fetch-user', async (req, res) => {
  const { access_token } = req.body;

  if (!access_token) {
    return res.status(400).json({ error: 'Access token is required' });
  }

  try {
    const response = await axios.get('https://api.pipedrive.com/v1/users/me', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    const companyId = response.data?.data?.company_id;

    if (!companyId) {
      return res.status(404).json({ error: 'Company ID not found in user data' });
    }

    res.status(200).json({ company_id: companyId });

  } catch (error) {
    console.error('❌ Error fetching user info:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch user info from Pipedrive' });
  }
});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));



app.get('/fetch-logs', async (req, res) => {
  try {
    const response = await axios.get('https://api.ivrsolutions.in/v1/call_logs', {
      headers: {
        Authorization: `Bearer ${process.env.IVR_TOKEN}`
      }
    });

    const { data } = response.data;
    const length = data.length;
    console.log(typeof data); 
    let finalressponse = [];
    let calllogloopstart = data.length - 1
    for(let i = length -1 ; i>=0; i--){
      if(data[i].recordid ==="2247037"){
        calllogloopstart = i;
        break;

      }
    }
  
    for (let i = calllogloopstart; i >0; i--) {

      await delay(5000);
      

      console.log(`Processing log ${i + 1}/${length}:`, data[i].client_no);
      
     

        const response = await axios.get(`https://api.pipedrive.com/v1/persons/search?term=${data[i].client_no}&fields=phone`, {
  headers: {
    'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`
  }
});
        finalressponse.push(response.data)
        

        if(response.data.data.items.length >0){
          console.log(response.data.data.items[0].item.id)


        


        


      

      const payload = {
        subject: `${data[i].call_type} Call From ${data[i].client_no} Record ID ${data[i].recordid}`,
        type: "call",
        done: 1,
        person_id: response.data.data.items[0].item.id,
        due_date: data[i].call_time,
        duration: data[i].call_duration,
      };

      console.log(payload);

      try {
        const postResponse = await axios.post('https://api.pipedrive.com/v1/activities', payload, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`
          }
        });
        console.log(`Posted activity ${i}:`, postResponse.data);
      } catch (postError) {
        console.error(`Error posting activity ${i}:`, postError.message);
      }
        }
        
         else {
  // 1. Create person
  const response = await axios.post('https://api.pipedrive.com/v1/persons', {
    name: "Lead from IVR",
    phone: data[i].client_no,
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`
    }
  });

  console.log(`Created person for ${data[i].client_no}:`, response.data);
  const personId = response.data.data.id;

  // 2. Create lead
  try {
    const leadPayload = {
      title: `Lead from IVR - ${data[i].client_no}`,
      person_id: personId
    };

    const leadResponse = await axios.post('https://api.pipedrive.com/v1/leads', leadPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`
      }
    });

    console.log(`Created lead for ${data[i].client_no}:`, leadResponse.data);
  } catch (leadError) {
    console.error(`Error creating lead for ${data[i].client_no}:`, leadError.message);
  }

  // 3. Post activity
  const payload = {
    subject: `${data[i].call_type} Call From ${data[i].client_no} Record ID ${data[i].recordid}`,
    type: "call",
    done: 1,
    person_id: personId,
    due_date: data[i].call_time,
    duration: data[i].call_duration,
  };

  try {
    const postResponse = await axios.post('https://api.pipedrive.com/v1/activities', payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`
      }
    });

    console.log(`Posted activity ${i}:`, postResponse.data);
  } catch (postError) {
    console.error(`Error posting activity ${i}:`, postError.message);
  }
}

        
    }

    // ✅ Send a final response after all posts are done
    res.status(200).json({
      message: 'Call logs processed and posted to Pipedrive',
      count: 5,
      data: finalressponse,
      recordid: data[0].recordid
    

    });

  } catch (error) {
    console.error('Error fetching logs:', error.message);
    res.status(500).send('Error fetching logs');
  }
});






app.post('/api/verify-token', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    console.log('🔍 Verifying IVR Token:', token);

    const response = await axios.post(
      'https://api.ivrsolutions.in/api/key_authentication',
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log('✅ IVR API response:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error(
      '❌ Error from IVR API:',
      error.response?.status,
      error.response?.data || error.message
    );
    res.status(500).json({ error: 'Token verification failed' });
  }
});
app.get('/api/persons', async (req,res)=>{

  const response = await axios.get('https://api.pipedrive.com/v1/persons', {
    headers: {
      'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`
    }
  });
  const newData = response.data.data.map(item => ({
  id: item.id,
  phone: item.phone[0].value,
  
}));
  res.status(200).json(newData);

    
  
 
})
// ✅ 3. Exchange authorization code for access and refresh tokens
app.post('/api/exchange-code', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required' });
  }

  try {
    const credentials = Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString('base64');

    const response = await axios.post(
      'https://oauth.pipedrive.com/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.REDIRECT_URI,
      }),
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      }
    );

    console.log('✅ Token response:', response.data);
    res.json(response.data); // contains access_token, refresh_token, etc.
  } catch (error) {
    console.error('❌ Token exchange error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Token exchange failed' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running at http://localhost:${PORT}`);
  
});




