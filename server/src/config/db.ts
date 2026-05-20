import mongoose, { mongo } from 'mongoose'

const connectDB = async()=>{
    try {
        mongoose.connection.on('connected',()=>console.log('DataBase connected'))
        await mongoose.connect(`${process.env.MONGODB_URI}/ShowTime-db`)
    } catch (error:any) {
        console.log(error.message)
    }
}

export default connectDB