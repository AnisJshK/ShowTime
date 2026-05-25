import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host:"ac713c001@smtp-brevo.com",
    port:587,
    auth:{
        user:process.env.SMTP_USER,
        pass:process.env.SMTP_PASS
    }
});

interface EmailOptions{
    to:string,
    subject:string,
    body:string
}


const sendEmail = async ({to,subject,body}:EmailOptions)=>{
const response = await transporter.sendMail({
    from:process.env.SENDER_EMAIL,
    to,
    subject,
    html:body,
})
return response
}

export default sendEmail;