import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectDB from './config/db.js'
import { clerkMiddleware } from '@clerk/express'
import { serve } from 'inngest/express'
import { inngest,functions } from './inngest/index.js'
import showRouter from './route/showRoutes.js'

const app = express();
const PORT = 3000;

await connectDB()


app.use(express.json())
app.use(cors())
app.use(clerkMiddleware())


app.get("/",async(req,res)=>{
    res.send('Server is Live!')
})
app.use('/api/inngest',serve({client:inngest,functions}))


app.use('/api/show',showRouter)

 
app.listen(PORT,()=>{
    console.log(`server running on http://localhost:${PORT}`)
})