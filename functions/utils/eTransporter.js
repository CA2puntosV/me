const nodemailer = require('nodemailer')
const smtpTransport = require('nodemailer-smtp-transport')
const transporter = nodemailer.createTransport(
    smtpTransport({
        host: 'smtp.hostinger.com',
        port: '465',
        auth: {
            user: 'admin@gourmeatsapp.com',
            pass: 'Brand$21'
        },
        secure: true,
        tls: {
            rejectUnauthorized: false
        },
        debug: false
    })
)
exports.transporter = transporter;