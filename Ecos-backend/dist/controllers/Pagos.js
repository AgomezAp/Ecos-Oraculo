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
exports.handleWebhook = exports.createCheckoutSession = exports.createPaymentIntent = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const Pagos_1 = require("../models/Pagos");
const stripe_1 = __importDefault(require("stripe"));
dotenv_1.default.config();
const createPaymentIntent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { items, customerInfo } = req.body;
        console.log("Received items:", items);
        console.log("Customer info:", customerInfo);
        // Validar que los datos del cliente estén presentes
        if (!customerInfo || !customerInfo.email || !customerInfo.name || !customerInfo.phone) {
            return res.status(400).send({
                error: 'Missing customer information. Name, email, and phone are required.'
            });
        }
        const paymentIntent = yield (0, Pagos_1.createPaymentIntentModel)(items, customerInfo);
        res.send({ clientSecret: paymentIntent.client_secret });
    }
    catch (error) {
        console.error("Stripe error details:", error);
        res.status(500).send({ error: 'An error occurred while creating the payment intent' });
    }
});
exports.createPaymentIntent = createPaymentIntent;
const createCheckoutSession = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { items } = req.body;
        const stripe = new stripe_1.default(process.env.SECRET_KEY);
        const session = yield stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: items.map((item) => ({
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: item.name || 'Product',
                    },
                    unit_amount: item.amount,
                },
                quantity: item.quantity || 1,
            })),
            mode: 'payment',
            // Esto solicita automáticamente los datos del cliente
            customer_creation: 'always',
            billing_address_collection: 'required', // Solicita nombre y dirección
            phone_number_collection: {
                enabled: true, // Solicita teléfono
            },
            success_url: `${process.env.CLIENT_URL || 'http://localhost:4200'}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL || 'http://localhost:4200'}/cancel`,
        });
        res.json({ url: session.url });
    }
    catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).send({ error: 'Failed to create checkout session' });
    }
});
exports.createCheckoutSession = createCheckoutSession;
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
