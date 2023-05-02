const mongoose = require('mongoose');
const Schema = mongoose.Schema;

module.exports = {
    Users: () => {
        const userSchema = Schema({
            email: String,
            fullname: String,
            country: String,
            password: String,
            api_key: String,
            api_revoked: {
                type: Boolean,
                default: false
            }
        }, { collection: 'users', versionKey: false })
        const Users = mongoose.model('Users', userSchema);
        return Users;
    },
    Forms: () => {
        const formSchema = Schema({
            user_id: mongoose.Schema.Types.ObjectId,
            forms: [
                {
                    form_id: String,
                    form_name: String,
                    created_date: Date,
                    send_mail: Boolean,
                    service_cancelled: {
                        type: Boolean,
                        default: false
                    },
                    form_data: Array
                }
            ],
        }, { collection: 'forms', versionKey: false })
        const Forms = mongoose.model('Forms', formSchema);
        return Forms;
    }
}