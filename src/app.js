import express from 'express';
import fileUpload from 'express-fileupload';
import routes from './routes/index.js';
import errorHandler from './middlewares/errorHandler.js';
import cors from 'cors';
import path from 'path';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: path.resolve('temp'),
    createParentPath: true
}));

app.use('/api', routes);

// Error handling middleware
app.use(errorHandler);

export default app;
