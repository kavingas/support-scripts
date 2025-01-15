const axios = require("axios");
require("dotenv").config();

const BASE_URL = process.env.BASE_URL + "/graphql";

// GraphQL Request Function
const graphqlRequest = async (query, variables = {}) => {
  try {
    const response = await axios.post(
      BASE_URL,
      { query, variables },
      {
        headers: {
          "Cookie": `XDEBUG_SESSION=PHPSTORM`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "GraphQL Request Error:",
      error.response?.data || error.message
    );
    throw new Error("GraphQL Request Failed");
  }
};

// Step 1: Create Cart
const createCart = async () => {
  const query = `
    mutation {
      createEmptyCart
    }
  `;
  const response = await graphqlRequest(query);
  return response.data.createEmptyCart;
};

// Step 2: Add Bundle Product to Cart
const addBundleProductToCart = async (cartId) => {
  const query = `
    mutation AddBundleToCart($cartId: String!) {
      addBundleProductsToCart(
          input: {
            cart_id: $cartId
            cart_items: [
            {
                data: {
                sku: "bundle-product-1"
                quantity: 1
                }
                bundle_options: [
                {
                    id: 2
                    quantity: 1
                    value: 2
                }
                ]
            },
            ]
        }) {
        cart {
          items {
            id
            product {
              name
              sku
            }
            quantity
          }
        }
      }
    }
  `;
  const variables = { cartId };
  const response = await graphqlRequest(query, variables);
  return response.data.addBundleProductsToCart.cart.items;
};

// Step 3: Set Shipping and Billing Address
const setAddresses = async (cartId) => {
  const query = `
    mutation SetAddresses($cartId: String!) {
      setBillingAddressOnCart(
        input: {
          cart_id: $cartId
          billing_address: {
            address: {
              firstname: "John"
              lastname: "Doe"
              street: ["123 Main Street"]
              city: "Los Angeles"
              region: "CA"
              postcode: "90001"
              country_code: "US"
              telephone: "1234567890"
            }
          }
        }
      ) {
        cart {
          billing_address {
            firstname
            lastname
          }
        }
      }

      setShippingAddressesOnCart(
        input: {
          cart_id: $cartId
          shipping_addresses: [
            {
              address: {
                firstname: "John"
                lastname: "Doe"
                street: ["123 Main Street"]
                city: "Los Angeles"
                region: "CA"
                postcode: "90001"
                country_code: "US"
                telephone: "1234567890"
              }
            }
          ]
        }
      ) {
        cart {
          shipping_addresses {
            firstname
            lastname
          }
        }
      }
    }
  `;
  const variables = { cartId };
  const response = await graphqlRequest(query, variables);
  return response.data;
};

// Step 4: Set Shipping Method
const setShippingMethod = async (cartId) => {
  const query = `
    mutation SetShippingMethod($cartId: String!) {
      setShippingMethodsOnCart(
        input: {
          cart_id: $cartId
          shipping_methods: [
            {
              carrier_code: "flatrate"
              method_code: "flatrate"
            }
          ]
        }
      ) {
        cart {
          shipping_addresses {
            selected_shipping_method {
              carrier_code
              method_code
            }
          }
        }
      }
    }
  `;
  const variables = { cartId };
  const response = await graphqlRequest(query, variables);
  return response.data.setShippingMethodsOnCart.cart.shipping_addresses;
};

// Step 5: Set Email on cart
const setGuestEmailOnCart = async (cartId) => {
  const query = `
      mutation SetEmail($cartId: String!) {
      setGuestEmailOnCart(input: { 
      cart_id: $cartId 
      email: "guest@example.com"
      }) {
        cart {
            email
        }
      }
    }
    `;
  const variables = { cartId };
  const response = await graphqlRequest(query, variables);
  return response.data.setGuestEmailOnCart.cart.email;
};

// Step 6: Set Payment Method
const setPaymentMethodOnCart = async (cartId) => {
  const query = `
     mutation PaymentMethod($cartId: String!) {
      setPaymentMethodOnCart(input: { 
      cart_id: $cartId
      payment_method: {
          code: "checkmo"
      }
      }) {
        cart {
            selected_payment_method {
                code
            }
        }

      }
    }
`;
  const variables = { cartId };
  const response = await graphqlRequest(query, variables);
  return response.data.setPaymentMethodOnCart.cart.selected_payment_method;
};

// Step 7: Place Order
const placeOrder = async (cartId) => {
  const query = `
    mutation PlaceOrder($cartId: String!) {
      placeOrder(input: { cart_id: $cartId }) {
        order {
          order_number
        }
      }
    }
  `;
  const variables = { cartId };
  const response = await graphqlRequest(query, variables);
  return response.data.placeOrder.order.order_number;
};

// Main Function to Execute the Workflow
const placeBundleOrder = async () => {
  try {
    console.log("Step 1: Creating a cart...");
    const cartId = await createCart();
    console.log("Cart ID:", cartId);

    console.log("Step 2: Adding bundle product to cart...");
    const cartItems = await addBundleProductToCart(cartId);
    console.log("Cart Items:", cartItems);

    console.log("Step 3: Setting addresses...");
    await setAddresses(cartId);

    console.log("Step 4: Setting shipping method...");
    await setShippingMethod(cartId);

    console.log("Step 5: Setting guest email...");
    await setGuestEmailOnCart(cartId);

    console.log("Step 6: Setting payment method...");
    await setPaymentMethodOnCart(cartId);

    console.log("Step 7: Placing the order...");
    const orderNumber = await placeOrder(cartId);
    console.log("Order placed successfully! Order Number:", orderNumber);
  } catch (error) {
    console.error("Error placing bundle order:", error.message);
  }
};

placeBundleOrder();
