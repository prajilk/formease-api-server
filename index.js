const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helper = require('./helpers/helper');

//Connect to database
require('./db/dbConnection')();

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors({
    origin: true,
    credentials: true,
}));


app.post('/form', async (req, res) => {
    const apiKey = req.query.api_key;
    const formId = req.query.form_id;

    if (!apiKey || !formId) {
        // Send a 400 Bad Request response if the required parameters are missing
        return res.status(400).json({
            status_code: 400,
            code: 'BAD REQUEST',
            error: 'Missing required query parameters'
        });
    }

    try {
        // Authenticate api key
        const user = await helper.authenticateAPIKey(apiKey)
        if (!Object.keys(user).length)
            return res.status(500).json({ status_code: 500, code: "INTERNAL SERVER ERROR", message: "Something went wrong!" });

        // Authenticate form id
        const form = await helper.authenticateFormId(user._id, formId)

        // Validate form data
        if (typeof req.body !== 'object' || Array.isArray(req.body))
            return res.status(400).json({ status_code: 400, code: 'BAD REQUEST', message: "Invalid value. Expected an object", received: Array.isArray(req.body) ? "array" : typeof req.body });
        if (!Object.keys(req.body).length)
            return res.status(400).json({ status_code: 400, code: 'BAD REQUEST', message: "Empty form data", form_data: {} });

        // Insert form data
        const submissionId = await helper.insertData(user._id, form.forms[0].form_id, req.body)

        if (form.forms[0].send_mail) {
            function validateEmail(email) {
                const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
                return emailRegex.test(email);
            }

            const transformedData = Object.entries(req.body).map(([field, value]) => {
                if (field === '_id_' || field === 'time') {
                    return null; // Skip the id and time fields
                }

                return {
                    field,
                    value,
                    mail: validateEmail(value)
                };
            });
            helper.sendMail(user.email, form.forms[0].form_name, transformedData)
        }

        return res.status(200).json({
            success: true,
            message: "Form submission saved successfully",
            formId: form.forms[0].form_id,
            submissionId: submissionId,
            sendMail: form.forms[0].send_mail
        })



    } catch (error) {
        if (error.status_code)
            return res.status(error.status_code).json(error);
        else
            return res.status(500).json(error);
    }

})

app.listen(4000, console.log('API Server running on Port: 4000'));