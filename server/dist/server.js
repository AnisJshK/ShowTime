import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './config/db.js';
const app = express();
const PORT = 3000;
await connectDB();
app.use(express.json());
app.use(cors());
app.get("/", async (req, res) => {
    res.send('Server is Live!');
});
app.listen(PORT, () => {
    console.log(`server running on http://localhost:${PORT}`);
});
//# sourceMappingURL=server.js.map