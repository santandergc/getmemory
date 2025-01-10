import { Request, Response } from 'express';
import Stripe from 'stripe';
import UserPayment from '../models/UserPayment';
import UserOnboarding from '../models/UserOnboarding';
import { sendPaymentConfirmationEmail } from '../utils/emailService';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

export const stripeController = {
  async handleWebhook(req: Request, res: Response) {
    try {
      const sig = req.headers['stripe-signature'] as string;
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

      let event: Stripe.Event;

      // Verificar la firma del webhook y construir el evento
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      } catch (err: any) {
        return res.status(400).json({ error: 'Error de verificación webhook' });
      }

      // Procesar solo el evento `checkout.session.completed`
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.customer_details) {
          try {
            // Primero maneja UserPayment
            const userPayment = await UserPayment.findOne({ 
              email: session.customer_details?.email 
            });

            if (userPayment) {
              userPayment.quantity += 1;
              await userPayment.save();
            } else {
              await UserPayment.create({
                email: session.customer_details?.email,
                active: true,
                quantity: 1
              });
            }

            // Luego maneja UserOnboarding
            const userOnboarding = await UserOnboarding.findOne({
              email: session.customer_details?.email
            });

            if (userOnboarding) {
              userOnboarding.availableUsers += 1;
              await userOnboarding.save();
              console.log(`UserOnboarding actualizado: ${userOnboarding.email}, usuarios disponibles: ${userOnboarding.availableUsers}`);
            } else {
              await UserOnboarding.create({
                email: session.customer_details?.email,
                availableUsers: 1,
                status: 'pending'
              });
              console.log(`Nuevo UserOnboarding creado: ${session.customer_details?.email}`);
            }

            await sendPaymentConfirmationEmail(session.customer_details?.email || '', session.customer_details?.name || '');
          } catch (error) {
            console.error(`Error procesando pago: ${error}`);
          }
        } else {
          console.error('No se encontró email del cliente en el evento.');
        }
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Error procesando webhook:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },
};