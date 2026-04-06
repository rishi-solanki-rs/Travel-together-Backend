import swaggerJsdoc from 'swagger-jsdoc';
import env from './env.js';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Together In India API',
      version: '1.0.0',
      description: 'Enterprise Travel Marketplace + CMS + Multi-Vendor SaaS Backend API',
      contact: {
        name: 'Together In India Engineering',
        email: 'tech@togetherinIndia.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}/api/${env.API_VERSION}`,
        description: 'Development Server',
      },
      {
        url: `https://api.togetherinIndia.com/api/${env.API_VERSION}`,
        description: 'Production Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User management' },
      { name: 'Vendors', description: 'Vendor management' },
      { name: 'Categories', description: 'Category management' },
      { name: 'Cities', description: 'City management' },
      { name: 'Listings', description: 'Universal listing core' },
      { name: 'Hotels', description: 'Hotel business suite' },
      { name: 'Things To Do', description: 'Tours and activities suite' },
      { name: 'Restaurants', description: 'Restaurant business suite' },
      { name: 'Shops', description: 'Shop business suite' },
      { name: 'Tribes', description: 'World Tribes suite' },
      { name: 'Kids World', description: 'Kids World suite' },
      { name: 'Destinations', description: 'Destination packages suite' },
      { name: 'CMS', description: 'CMS section management' },
      { name: 'Pages', description: 'Page builder and renderer' },
      { name: 'Plans', description: 'Subscription plans' },
      { name: 'Slots', description: 'Slot monetization engine' },
      { name: 'Lucky Draw', description: 'Campaign engine' },
      { name: 'Analytics', description: 'Analytics and tracking' },
      { name: 'Search', description: 'Search and discovery' },
      { name: 'Uploads', description: 'Media pipeline' },
      { name: 'Wishlist', description: 'User wishlist' },
      { name: 'Inquiries', description: 'Inquiry management' },
      { name: 'SEO', description: 'SEO configuration' },
      { name: 'Notifications', description: 'Notification system' },
      { name: 'Reports', description: 'Admin reports' },
    ],
  },
  apis: ['./src/modules/**/*.routes.js', './src/modules/**/*.controller.js'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
