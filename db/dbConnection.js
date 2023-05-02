const mongoose = require('mongoose');
require('dotenv').config();

const connect = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        })
        console.log('Connect to database: "form-ease"');
    } catch (error) {
        console.log(error.message)
    }
}

module.exports = connect;