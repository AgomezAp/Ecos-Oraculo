"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWebhook = exports.createPaymentIntent = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const Pagos_1 = require("../models/Pagos");
const stripe_1 = __importDefault(require("stripe"));
dotenv_1.default.config();
const createPaymentIntent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { items } = req.body;
        console.log("Received items:", items); // Log the incoming data
        const paymentIntent = yield (0, Pagos_1.createPaymentIntentModel)(items);
        res.send({ clientSecret: paymentIntent.client_secret });
    }
    catch (error) {
        console.error("Stripe error details:", error); // Log the full error
        res.status(500).send({ error: 'An error occurred while creating the payment intent' });
    }
});
exports.createPaymentIntent = createPaymentIntent;
const handleWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const stripe = new stripe_1.default(process.env.SECRET_KEY);
    const signature = req.headers['stripe-signature'];
    try {
        const event = stripe.webhooks.constructEvent(req.body, signature, process.env.WEBHOOK_SECRET);
        // Handle successful payments
        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            console.log(`Payment succeeded: ${paymentIntent.id}`);
            // Here you can update your database, send confirmation emails, etc.
        }
        else if (event.type === 'payment_intent.payment_failed') {
            const paymentIntent = event.data.object;
            console.log(`Payment failed: ${paymentIntent.id}`);
            // Handle the failed payment, e.g., notify the user, log the error, etc.
        }
        res.json({ received: true });
    }
    catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});
exports.handleWebhook = handleWebhook;
