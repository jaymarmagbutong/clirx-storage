import 'module-alias/register.js';
import app from './src/app.js';


const port = process.env.PORT || 8000;

app.listen(port, () => {
    console.log(`Clirx-Storage API is running on port ${port}`);
});
