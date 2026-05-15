import { MercadoPagoConfig, PreApprovalPlan } from 'mercadopago';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function test() {
  dotenv.config({ path: path.join(__dirname, '../.env') });
  const accessToken = process.env.MP_ACCESS_TOKEN;

  const client = new MercadoPagoConfig({
    accessToken: accessToken || '',
  });

  const plan = new PreApprovalPlan(client);

  try {
    const response = await plan.create({
      body: {
        reason: "Test Plan " + Date.now(),
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: 100,
          currency_id: 'ARS',
        },
        back_url: "https://google.com",
      },
    });
    console.log(JSON.stringify(response, null, 2));
  } catch (error) {
    console.error(error);
  }
}

test();
