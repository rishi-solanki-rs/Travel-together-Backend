import fs from 'fs';

const collection = {
  info: {
    name: "Together In India API",
    description: "Enterprise Backend for Travel Marketplace",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  variable: [
    { key: "baseUrl", value: "http://localhost:5000/api/v1", type: "string" },
    { key: "token", value: "", type: "string" }
  ],
  item: [
    {
      name: "Auth",
      item: [
        {
          name: "Verify OTP",
          request: {
            method: "POST",
            url: "{{baseUrl}}/auth/verify-otp",
            body: {
              mode: "raw",
              raw: "{\n  \"email\": \"admin@togetherinIndia.com\",\n  \"otp\": \"123456\"\n}",
              options: { raw: { language: "json" } }
            }
          }
        },
        {
          name: "Login",
          request: {
            method: "POST",
            url: "{{baseUrl}}/auth/login",
            body: {
              mode: "raw",
              raw: "{\n  \"email\": \"admin@togetherinIndia.com\",\n  \"password\": \"Admin@123456\"\n}",
              options: { raw: { language: "json" } }
            }
          }
        }
      ]
    },
    {
      name: "Categories",
      item: [
        {
          name: "Get All Categories",
          request: {
            method: "GET",
            url: "{{baseUrl}}/categories"
          }
        }
      ]
    },
    {
      name: "Pages",
      item: [
        {
          name: "Render Home Page",
          request: {
            method: "GET",
            url: "{{baseUrl}}/pages/render/home"
          }
        }
      ]
    },
    {
      name: "Search",
      item: [
        {
          name: "Search Listings",
          request: {
            method: "GET",
            url: "{{baseUrl}}/search?q=hotel"
          }
        }
      ]
    }
  ]
};

fs.writeFileSync('Together_In_India_Postman.json', JSON.stringify(collection, null, 2));
console.log('Postman collection generated successfully.');
