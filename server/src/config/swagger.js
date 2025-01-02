import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Server API Documentation',
            version: '1.0.0',
            description: 'API documentation for the server application.',
        },
        servers: [
            {
                url: 'http://localhost:3000/api',
                description: 'Development Server',
            },
            {
                url: 'https://hustbook.onrender.com/api',
                description: 'Production Server',
            },
        ],
        tags: [
            {
                name: 'Auth',
                description: 'Endpoints related to user authentication and token management.'
            },
            {
                name: 'Users',
                description: 'Endpoints for user profile and account management.'
            },
            {
                name: 'Posts',
                description: 'Endpoints related to managing posts.'
            },
            {
                name: 'Notifications',
                description: 'Endpoints for notification settings and retrieval.'
            },
            {
                name: 'Chat',
                description: 'Endpoints for managing chats and conversations.'
            },
            {
                name: 'Friends',
                description: 'Endpoints related to friend requests and friend lists.'
            },
            {
                name: 'Video',
                description: 'Endpoints related to video retrieval and management.'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your bearer token in the format **Bearer &lt;token&gt;**'
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ]
    },
    apis: [
        'src/routes/*.js',
        'src/controllers/*.js',
        'src/models/*.js'
    ]
};

const specs = swaggerJsdoc(options);

export default specs;