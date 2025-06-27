import dotenv from 'dotenv';
import express from 'express';
import { createPaymentIntentModel } from "../models/Pagos";
import e, { Request, Response } from "express";
import Stripe from 'stripe';

dotenv.config();


export const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    console.log("Received items:", items); // Log the incoming data
    const paymentIntent = await createPaymentIntentModel(items);
    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Stripe error details:", error); // Log the full error
    res.status(500).send({ error: 'An error occurred while creating the payment intent' });
  }
};
export const handleWebhook = async (req: express.Request, res: express.Response) => {
  const stripe = new Stripe(process.env.SECRET_KEY!);
  const signature = req.headers['stripe-signature'] as string;
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body, 
      signature, 
      process.env.WEBHOOK_SECRET!
    );
    
    // Handle successful payments
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`Payment succeeded: ${paymentIntent.id}`);
      
      // Here you can update your database, send confirmation emails, etc.

    }else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`Payment failed: ${paymentIntent.id}`);
      
      // Handle the failed payment, e.g., notify the user, log the error, etc.
    }
    
    res.json({ received: true });
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
};