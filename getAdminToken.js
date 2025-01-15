const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL;

// Admin credentials
const username = process.env.ADMIN_USERNAME; // Admin username
const password = process.env.ADMIN_PASSWORD; // Admin password

// Function to obtain the Admin Token
const getAdminToken = async () => {
  try {
    const response = await axios.post(`${BASE_URL}/rest/V1/integration/admin/token`, {
      username,
      password,
    });

    const token = response.data;
    console.log("Admin Token:", token);

    // Save the token to a file or use it for further requests
    return token;
  } catch (error) {
    console.error("Error obtaining Admin Token:", error.response?.data || error.message);
  }
};

exports.getAdminToken = getAdminToken;
