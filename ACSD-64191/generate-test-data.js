const axios = require("axios");
const getAdminToken = require("../getAdminToken");
require("dotenv").config();

const BASE_URL = process.env.BASE_URL;

// Function to create a simple product
const createSimpleProduct = async (token, sku, name, price) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/rest/V1/products`,
      {
        product: {
          sku: sku,
          name: name,
          price: price,
          status: 1, // Enabled
          type_id: "simple", // Simple product
          visibility: 4, // Catalog, Search
          attribute_set_id: 4, // Default attribute set
          weight: 1.0,
          extension_attributes: {
            stock_item: {
              qty: 100,
              is_in_stock: true,
            },
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`Product created: ${sku}`, response.data);
  } catch (error) {
    console.error(
      `Error creating product ${sku}:`,
      error.response?.data || error.message
    );
  }
};

const createBundleProduct = async (token, sku, name, price) => {
  try {
    // Step 1: Create the Bundle Product
    const productResponse = await axios.post(
      `${BASE_URL}/rest/V1/products`,
      {
        "product": {
          "sku": sku,
          "name": name,
          "attribute_set_id": 4,
          "status": 1,
          "visibility": 4,
          "type_id": "bundle",
          "extension_attributes": {
            "stock_item": {
              "qty": 100,
              "is_in_stock":true
            },
            "website_ids": [
              1
            ],
            "bundle_product_options": [
              {
                "option_id": 0,
                "position": 1,
                "sku": "simple-product-1",
                "title": "Option 1",
                "type": "select",
                "required": true,
                "product_links": [
                  {
                    "sku": "simple-product-1",
                    "option_id": 1,
                    "qty": 1,
                    "position": 1,
                    "is_default": false,
                    "price": 0,
                    "price_type": 0,
                    "can_change_quantity": 0
                  }
                ]
              }
            ]
          },
          "custom_attributes": [
            {
              "attribute_code": "price_view",
              "value": "0"
            }
          ]
        },
        "saveOptions": true
      }
      ,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`Product ${sku} created:`, productResponse.data?.sku);
  } catch (error) {
    console.error(
      `Error creating bundle product ${sku}:`,
      error.response?.data || error.message
    );
  }
};

// Create 100 bundle products
const createProducts = async () => {
  const token = await getAdminToken.getAdminToken();
  await createSimpleProduct(token, "simple-product-1", "Simple Product 1", 10);
  for (let i = 1; i <= 1000; i++) {
    const sku = `bundle-product-${i}`;
    const name = `Bundle Product ${i}`;
    const price = 100 + i;
    await createBundleProduct(token, sku, name, price);
  }
};

(async () => {
  await createProducts();
})();
