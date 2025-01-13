import express from 'express';
import fileUpload from 'express-fileupload';
import routes from './routes/index.js';
import errorHandler from './middlewares/errorHandler.js';
import cors from 'cors';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload());

app.use('/api', routes);

// Error handling middleware
app.use(errorHandler);

export default app;
