 import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import dotenv from 'dotenv';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config();


const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
// 🟢 Health check

app.get('/', (req, res) => {
  res.status(200).send('OK');
});
app.get('/person-action-modal', async (req, res) => {
  try {
    const { selectedIds } = req.query;
    const personIds = selectedIds ? selectedIds.split(',') : [];

    console.log('Selected Person IDs:', personIds);

    if (personIds.length === 0) {
      return res.status(400).json({
        error: { message: "No person selected" }
      });
    }

    const itemsdata = [];

    // ✅ Async function to fetch dialers and return list
    async function fetchDialers() {
      const response = await fetch('https://api.ivrsolutions.in/api/get_dialers_list', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer 9d9e342f9478836c02171cbcf68d0c7b',
          'Content-Type': 'application/json'
        }
      });

      const dialers = await response.json();
      if (!dialers.data) {
        throw new Error("No dialer data found");
      }

      dialers.data.forEach(item => {
        itemsdata.push({
          label: `${item.name} (${item.status})`,
          value: item.id
        });
      });
    }

    // ⏳ Wait for dialer fetch to finish before responding
    await fetchDialers();

    // ✅ Now return the modal structure
    res.json({
      data: {
        blocks: {
          action_selection: {
            items: itemsdata
          },
          project_selection: {},
          followup_date: {}
        },
        actions: {
          cancel_action: {},
          submit_action: {}
        }
      }
    });

  } catch (error) {
    console.error('Error handling modal request:', error);
    res.status(500).json({
      error: { message: "Failed to load person data" }
    });
  }
});

const extractPhoneNumbers = (person) => {
  return (person.phone || [])
    .map(p => p.value)
    .filter(Boolean);
};

app.post('/person-action-modal', async (req, res) => {
  try {
    console.log("🟢 Received from modal:", req.body);
    console.log("🟡 Query params:", req.query);

    const {
      action_selection: dialerId,
      followup_date,
      project_selection: timezone,
      followup_time_text:time
    } = req.body;

console.log(time)

    const {
      selectedIds = '',
      companyId,
    } = req.query;

    const personIds = selectedIds.split(',').map(id => id.trim());
    console.log(personIds)
    const domain = 'abhishek-sandbox3.pipedrive.com'; // Make dynamic if needed
    
    const phoneNumbers = [];

    // 🔁 Fetch phone numbers for each person
    for (const personId of personIds) {
      const url = `https://${domain}/api/v1/persons/${personId}`;

      try {
        const { data: person } = await axios.get(url, {
          headers: {
            Authorization: `Bearer v1u:AQIBAHj-LzTNK2yuuuaLqifzhWb9crUNKTpk4FlQ9rjnXqp_6AH1xWIuX4UNV4pLjxXmWX9qAAAAfjB8BgkqhkiG9w0BBwagbzBtAgEAMGgGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMFHdktw7w7f0Pjg7rAgEQgDvdZiq5D_z3NrqUDbPJtST4-2TOMCW6wX9bysOeNz1dnXk2iat6N4tJCtsyTenFd4dHuS53Kg7r436P0Q:wE6QbqBFUxguWOXwGl5NfFP8En_LUu-meDBY-EAOKPpGnxQ5UqfIZm-sLOfcVUAKNElR6k0YSJrb9s5LPHsXmA3rzqii0JUtyW2SinbtTH-zdNiB3RggnqaXoiV18ZkZK4CBwmWEd5htpVBGVqcF6Q1ctIKTByIu-wGGlUDgP42ncBUdpGz59k0kvy6xnNSjenHiLL38cJURy2BtCbm2AU2hUHUtyJVmx1qLFi9PgZW1KvigeKo5TnEX2YGcgmDA0b_6WQ1YL2U2047MrvJh98F0ipyOXIhLqwMYEpsXTRaGseQqf7izRAIOMAKMkP68Ox-XNkA8MpUUICj55qJrbeWnYxo5zC_WU7YSO2AvLkfFBSN2HrwDo3m2EcfglHMVCKbjPJ4JiDqFU-Y1jXGVz8RN84gzsdkJtWaIlY8vM2gk_ete`
          }
        });

        const personData = person?.data;
        const phones = personData?.phone;

        if (!Array.isArray(phones)) {
          console.warn(`⚠️ No phone array for personId ${personId}`);
          continue;
        }

        phones.forEach(entry => {
          const num = entry?.value;
          if (num) {
            phoneNumbers.push({ phone_number: num });
          }
        });

        console.log( phoneNumbers)

      } catch (err) {
        console.error(`❌ Failed to fetch personId ${personId}:`, err.response?.status, err.message);
        continue; // Skip this person and continue the loop
      }
    }

    if (!phoneNumbers.length) {
      return res.status(400).json({
        success: false,
        message: "No phone numbers found."
      });
    }

    // 📦 Dialer payload
    const payload = {
      dialerid: dialerId,
      recordList: phoneNumbers
    };

    if (followup_date && timezone) {
      payload.schedule_datetime = `${followup_date} ${time}:00`;
      payload.timezone = timezone;
    }

    console.log("📤 Final Payload to be sent:", payload);

    // 📤 Send to Dialer
    const dialerResponse = await axios.post(
      'https://api.ivrsolutions.in/v1/add_to_dialer',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer 9d9e342f9478836c02171cbcf68d0c7b`
        }
      }
    );

    console.log("✅ Dialer response:", dialerResponse.data);

    return res.json({
      success: {
        message: "Action received and processed."
      }
    });

  } catch (error) {
    console.error("❌ Fatal error in /person-action-modal:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to add to dialer.",
      error: error.message
    });
  }
});

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
  const {ivrtoken} = req.body;
  console.log ('🔍 Exchange Code:', code);
  console.log('🔍 IVR Token:', ivrtoken);

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

     const personresponse = await axios.get('https://api.pipedrive.com/v1/users/me', {
    headers: {
      'Authorization': `Bearer ${response.data.access_token}` 
    }
  });
 

    
   

const payload = {
  access_token: response.data.access_token,
  refresh_token: response.data.refresh_token,
  api_domain_url: response.data.api_domain,
  ivr_token: ivrtoken,
  record_id: null,
  user_Id: personresponse.data.data.id,
  company_id: personresponse.data.data.company_id,
  new_lead: true,
};

console.log('✅ Payload:', payload);

axios.post('https://api.ivrsolutions.in/pipedrive/add_new_account', payload, {
  headers: {
    Authorization: `Bearer ${ivrtoken}`,
    
  },
})
.then(res => {
  console.log('✅ Success:', res.data);
})
.catch(err => {
  console.error('❌ Error:', err.response ? err.response.data : err.message);
});

    
    

    res.json(response.data); // contains access_token, refresh_token, etc.

  } catch (error) {
    console.error('❌ Token exchange error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Token exchange failed' });
  }
});

app.use(express.static(path.join(__dirname, '../hubspot/dist')));
app.get("/{*any}", (req, res) => {
  
  res.sendFile(path.join(__dirname, '../hubspot/dist/index.html'));
  
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running at http://localhost:${PORT}`);
  
});




