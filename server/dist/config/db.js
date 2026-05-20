import mongoose, { mongo } from 'mongoose';
const connectDB = async () => {
    try {
        mongoose.connection.on('connection', () => console.log('DataBase connected'));
        await mongoose.connect(`${process.env.MONGODB_URI}/ShowTime-db`);
    }
    catch (error) {
        console.log(error.message);
    }
};
export default connectDB;
//# sourceMappingURL=db.js.map