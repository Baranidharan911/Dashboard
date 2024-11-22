import express from 'express';
import Razorpay from 'razorpay';
import cors from 'cors';
import bodyParser from 'body-parser';
import crypto from 'crypto';

const app = express();
app.use(cors());
app.use(bodyParser.json());

const razorpay = new Razorpay({
    key_id: 'rzp_live_O5AirT0bLUgu0B',  // Replace with your actual Razorpay Key ID
    key_secret: 'Zdib2EZN8nyk168oXaHo0wOb'  // Replace with your actual Razorpay Key Secret
});

// Endpoint to create a Razorpay order
app.post('/create-order', async (req, res) => {
    const { amount, currency, receipt } = req.body;

    try {
        const options = {
            amount: amount * 100, // amount in the smallest currency unit
            currency,
            receipt,
        };

        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        res.status(500).send(error);
    }
});

// Endpoint to verify payment
app.post('/verify-payment', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const shasum = crypto.createHmac('sha256', razorpay.key_secret);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = shasum.digest('hex');

    if (generatedSignature === razorpay_signature) {
        res.json({ status: 'success' });
    } else {
        res.json({ status: 'failure' });
    }
});

// Endpoint to create a payout to a technician's bank account
app.post('/create-payout', async (req, res) => {
    const { accountHolderName, accountNumber, ifscCode, amount, currency, technicianId, enquiryId } = req.body;

    try {
        const payout = await razorpay.payouts.create({
            account_holder_name: accountHolderName,
            account_number: accountNumber,
            ifsc: ifscCode,
            amount: amount * 100, // Convert amount to paise
            currency: currency || 'INR',
            purpose: "payout",
            method: "IMPS", // or NEFT, RTGS, etc.
            queue_if_low_balance: true, // Optional: queues payout if low balance
            reference_id: `enquiry_${enquiryId}_technician_${technicianId}`,
        });

        res.json({ status: "success", payout });
    } catch (error) {
        console.error("Error creating payout:", error);
        res.status(500).json({ status: "error", error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
