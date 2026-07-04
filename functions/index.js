const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const { MercadoPagoConfig, Payment } = require("mercadopago");

admin.initializeApp();
const db = admin.firestore();

// Inicialização segura do SDK do Mercado Pago
const getMercadoPagoClient = () => {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN || functions.config().mercadopago?.token;
  if (!token) {
    throw new Error("Token de Acesso do Mercado Pago não configurado. Defina a variável MERCADO_PAGO_ACCESS_TOKEN nas configurações do Firebase.");
  }
  return new MercadoPagoConfig({ accessToken: token });
};

// 1. Rota HTTPS para Criar Pagamento Pix
exports.criarPagamentoPix = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    try {
      const { atleta_id, pelada_id, data_realizacao_id, nome, email, cpf, valor } = req.body;

      if (!pelada_id || !data_realizacao_id || !nome || !email || !cpf || !valor) {
        return res.status(400).json({ error: "Parâmetros obrigatórios ausentes" });
      }

      const client = getMercadoPagoClient();
      const payment = new Payment(client);

      const splitNome = nome.trim().split(" ");
      const firstName = splitNome[0];
      const lastName = splitNome.slice(1).join(" ") || "Silva";

      const paymentData = {
        body: {
          transaction_amount: Number(valor),
          description: `Diária Pelada - ${nome}`,
          payment_method_id: "pix",
          payer: {
            email: email.trim(),
            first_name: firstName,
            last_name: lastName,
            identification: {
              type: "CPF",
              number: cpf.replace(/\D/g, "")
            }
          },
          // O Mercado Pago notificará este mesmo servidor via webhook
          notification_url: `https://${process.env.FUNCTION_REGION || "us-central1"}-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/webhookMercadoPago`,
          metadata: {
            atleta_id: String(atleta_id),
            pelada_id: String(pelada_id),
            data_realizacao_id: String(data_realizacao_id),
            nome: nome,
            email: email,
            cpf: cpf
          }
        }
      };

      const response = await payment.create(paymentData);

      // Extrai os dados do Pix da resposta
      const qrCodeBase64 = response.point_of_interaction?.transaction_data?.qr_code_base64;
      const qrCodeCopiaCola = response.point_of_interaction?.transaction_data?.qr_code;
      const paymentId = response.id;

      res.status(200).json({
        success: true,
        paymentId: String(paymentId),
        qrCodeBase64,
        qrCodeCopiaCola,
        status: response.status
      });

    } catch (error) {
      console.error("Erro ao criar pagamento Mercado Pago:", error);
      res.status(500).json({ error: error.message || "Erro interno ao processar o pagamento" });
    }
  });
});

// 2. Webhook HTTPS para Receber Notificações do Mercado Pago
exports.webhookMercadoPago = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Método não permitido");
  }

  try {
    const { action, type, data } = req.body;
    
    // O Mercado Pago envia notificações com tipos variados. Focamos em payment
    const isPaymentUpdate = type === "payment" || action === "payment.created" || action === "payment.updated";
    const paymentId = data?.id || req.query.id;

    if (isPaymentUpdate && paymentId) {
      const client = getMercadoPagoClient();
      const payment = new Payment(client);

      // Busca os detalhes oficiais do pagamento diretamente na API do Mercado Pago
      const paymentDetails = await payment.get({ id: paymentId });

      if (paymentDetails.status === "approved") {
        const metadata = paymentDetails.metadata;

        if (metadata && metadata.pelada_id && metadata.data_realizacao_id) {
          // Grava o pagamento aprovado no Firestore na coleção pagamentos_pix
          // O cliente (frontend React) escutará esta coleção e aplicará localmente
          const payDocRef = db.collection("pagamentos_pix").doc(String(paymentId));
          
          await payDocRef.set({
            status: "approved",
            atleta_id: metadata.atleta_id,
            pelada_id: metadata.pelada_id,
            data_realizacao_id: metadata.data_realizacao_id,
            nome: metadata.nome,
            email: metadata.email,
            cpf: metadata.cpf,
            valor: Number(paymentDetails.transaction_amount),
            processed: false,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          });

          console.log(`[Pix Webhook] SUCESSO: Pagamento ${paymentId} aprovado e registrado para o atleta ${metadata.nome}.`);
        } else {
          console.warn(`[Pix Webhook] AVISO: Pagamento ${paymentId} aprovado, mas sem metadados válidos.`);
        }
      } else {
        console.log(`[Pix Webhook] Status do pagamento ${paymentId}: ${paymentDetails.status}`);
      }
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Erro no Webhook do Mercado Pago:", error);
    res.status(500).send("Erro interno ao processar o webhook");
  }
});
