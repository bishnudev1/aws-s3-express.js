import express, { Request, Response } from 'express';
import { config } from 'dotenv';
import fileparser from './fileparser';

config(); // Load environment variables from .env file

const app = express();
app.set('json spaces', 5); // to prettify JSON response

const PORT = process.env.PORT || 3000;

app.get('/', (req: Request, res: Response) => {
    res.send(`
    <h2>File Upload With <code>"Node.js"</code></h2>
    <form action="/api/upload" enctype="multipart/form-data" method="post">
      <div>Select a file: 
        <input name="file" type="file" />
      </div>
      <input type="submit" value="Upload" />
    </form>
  `);
});

app.post('/api/upload', async (req: Request, res: Response) => {
    try {
        const data = await fileparser(req);
        res.status(200).json({
            message: "Success",
            data,
        });
    } catch (error) {
        res.status(400).json({
            message: "An error occurred.",
            error,
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}.`);
});
