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
exports.createPaymentIntentModel = void 0;
const stripe_1 = __importDefault(require("stripe"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const stripe = new stripe_1.default(process.env.SECRET_KEY);
const calculateOrderAmount = (items) => {
    let total = 0;
    if (!items || !items.length) {
        console.log("Warning: Empty items array");
        return 1000; // Default amount in cents (e.g., $10.00)
    }
    items.forEach((item) => {
        if (item && typeof item.amount === 'number') {
            total += item.amount;
        }
        else {
            console.log("Warning: Item without valid amount", item);
        }
    });
    // Ensure minimum amount (Stripe requires at least 50 cents in most currencies)
    return Math.max(total, 100);
};
const createPaymentIntentModel = (items) => __awaiter(void 0, void 0, void 0, function* () {
    return yield stripe.paymentIntents.create({
        amount: calculateOrderAmount(items),
        currency: "eur",
        automatic_payment_methods: {
            enabled: true,
        },
    });
});
exports.createPaymentIntentModel = createPaymentIntentModel;
