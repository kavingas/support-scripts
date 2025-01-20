/**
 * This script generate 20000 bundle products with 1 simple product each.
 * All the bundled products are disabled
 */
const axios = require("axios");
const getAdminToken = require("../getAdminToken");
require("dotenv").config();

const BASE_URL = process.env.BASE_URL;
const MAC_CONCURRENT_REQUESTS = 100;

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
          "status": 0, // Disabled
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

// Create bundle products
const createProducts = async () => {
  const token = await getAdminToken.getAdminToken();
  await createSimpleProduct(token, "simple-product-1", "Simple Product 1", 10);
  const queue = [];
  for (let i = 1; i <= 20000; i++) {
    const sku = `bundle-product-dis-${i}`;
    const name = `Bundle Product Dis ${i}`;
    const price = 100 + i;
    queue.push(createBundleProduct(token, sku, name, price));
    if (queue.length === MAC_CONCURRENT_REQUESTS) {
      await Promise.all(queue);
      queue.length = 0; 
  }
  }
};

(async () => {
  await createProducts();
})();
