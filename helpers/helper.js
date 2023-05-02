const { default: mongoose } = require('mongoose');
const models = require('../db/dbModels')
const path = require('path')
var nodemailer = require('nodemailer');
var hbs = require('nodemailer-express-handlebars');
require('dotenv').config()

const formModel = models.Forms();
const userModel = models.Users();

module.exports = {
    authenticateAPIKey: (apiKey) => {
        return new Promise(async (resolve, reject) => {
            const user = await userModel.findOne({ api_key: apiKey })
            if (!user)
                return reject({
                    status_code: 403,
                    code: 'FORBIDDEN',
                    message: "Invalid API Key"
                })
            if (user.api_revoked)
                return reject({
                    status_code: 403,
                    code: 'FORBIDDEN',
                    message: "API Key revoked",
                    api_revoked: user.api_revoked
                })
            resolve(user)
        })
    },
    authenticateFormId: (userId, formId) => {
        return new Promise(async (resolve, reject) => {
            const form = await formModel.findOne({
                user_id: userId,
                forms: {
                    $elemMatch: {
                        form_id: formId
                    }
                }
            }, { "forms.$": 1 })

            if (!form)
                return reject({
                    status_code: 403,
                    code: 'FORBIDDEN',
                    message: "Invalid form id"
                })
            if (form.forms[0].service_cancelled)
                return reject({
                    status_code: 403,
                    code: 'FORBIDDEN',
                    message: "Form service currently stopped",
                    service_cancelled: form.forms[0].service_cancelled
                })
            resolve(form)
        })
    },
    insertData: (userId, formId, formData) => {
        return new Promise(async (resolve, reject) => {

            formData.time = new Date();
            formData._id_ = new mongoose.Types.ObjectId();
            const submissionId = formData._id_.toString();

            const updatedData = await formModel.findOneAndUpdate(
                { user_id: userId, 'forms.form_id': formId },
                { $push: { 'forms.$.form_data': formData } },
                { new: true }
            )

            let isPresent = false;

            updatedData.forms.forEach(form => {
                const foundData = form.form_data.find(item => item._id_.toString() === submissionId);
                if (foundData) {
                    isPresent = true;
                    return;
                }
            });

            if (isPresent) {
                resolve(submissionId)
            } else {
                reject({ status_code: 500, code: 'INTERNAL SERVER ERROR', message: "Something went wrong!" })
            }
        })
    },
    sendMail: (userMail, formTitle, formData) => {

        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'formeaseapp@gmail.com',
                pass: process.env.PASSWORD
            }
        });

        const handlebarOptions = {
            viewEngine: {
                extName: ".handlebars",
                partialsDir: path.resolve('./helpers'),
                defaultLayout: false,
            },
            viewPath: path.resolve('./helpers'),
            extName: ".handlebars",
        }

        transporter.use('compile', hbs(handlebarOptions));

        var mailOptions = {
            from: 'formeaseapp@gmail.com',
            to: userMail,
            subject: 'New submission using formease',
            template: 'email-template',
            context: {
                form_name: formTitle,
                data: formData,
                date: new Date().toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                })
            }

        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });

    }
}