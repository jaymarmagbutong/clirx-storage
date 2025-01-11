import express from 'express';
import fileUpload from 'express-fileupload';
import routes from './routes/index.js';
import errorHandler from './middlewares/errorHandler.js';


const app = express();

// Middleware
app.use(express.json());
app.use(fileUpload());
app.use('/api', routes);

// Error handling middleware
app.use(errorHandler);

export default app;
