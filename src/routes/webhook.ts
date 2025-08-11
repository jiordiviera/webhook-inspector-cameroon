import { WebhookModel } from "../models/webhook.ts";
import { WebhookValidator } from "../services/webhook-validator.ts";
import { CameroonTimeUtils, MobileMoneyDetector } from "../utils/cameroon.ts";
import { broadcastToClients } from "../server.ts";

export const webhookRoutes = {
  async handleWebhook(req: Request): Promise<Response> {
    const startTime = Date.now();

    try {
      // Extraire les informations de la requête
      const clientIP =
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        "unknown";

      const userAgent = req.headers.get("user-agent") || "unknown";
      const signature =
        req.headers.get("x-signature") ||
        req.headers.get("x-hub-signature-256") ||
        req.headers.get("signature");

      // Lire le payload
      const payloadText = await req.text();
      const processingTime = Date.now() - startTime;

      console.log(`🎯 Nouveau webhook reçu de ${clientIP}`);
      console.log(`📝 Payload: ${payloadText.substring(0, 200)}...`);

      // Collecter tous les headers
      const headers: Record<string, string> = {};
      req.headers.forEach((value, key) => {
        headers[key] = value;
      });

      // Validation du payload JSON
      const payloadValidation = WebhookValidator.validatePayload(payloadText);
      if (!payloadValidation.isValid) {
        console.log(`❌ Payload invalide: ${payloadValidation.error}`);

        // Stocker quand même le webhook avec erreur
        const webhookId = WebhookModel.create({
          event_type: "invalid_payload",
          payload: payloadText,
          headers: JSON.stringify(headers),
          signature,
          is_valid_signature: false,
          received_at: CameroonTimeUtils.now().format(),
          response_status: 400,
          processing_time_ms: processingTime,
          source_ip: clientIP,
          user_agent: userAgent,
        });

        return new Response(
          JSON.stringify({
            success: false,
            error: payloadValidation.error,
            webhook_id: webhookId,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Parser le payload
      const payload = JSON.parse(payloadText);

      // Valider la signature si un secret est configuré
      let isValidSignature = true;
      let signatureError = null;

      if (signature) {
        // TODO: Récupérer le secret depuis la config
        const secret = process.env.WEBHOOK_SECRET || "";

        if (secret) {
          const signatureValidation = WebhookValidator.validateSignature(
            payloadText,
            signature,
            secret
          );

          isValidSignature = signatureValidation.isValid;
          signatureError = signatureValidation.error;

          if (!isValidSignature) {
            console.log(`🔐 Signature invalide: ${signatureError}`);
          }
        } else {
          console.log("⚠️ Signature présente mais aucun secret configuré");
        }
      } else {
        console.log("⚠️ Aucune signature fournie");
      }

      // Détecter le type d'événement
      const eventType = WebhookValidator.detectEventType(payload, headers);

      // Extraire l'ID de l'entreprise
      const companyId = WebhookValidator.extractCompanyId(payload, headers);

      // Détecter le service de paiement mobile
      const mobileProvider = MobileMoneyDetector.detectProvider(payload);
      if (mobileProvider) {
        console.log(`📱 Paiement mobile détecté: ${mobileProvider}`);
      }

      // Enregistrer le webhook en base
      const webhookId = WebhookModel.create({
        event_type: eventType,
        company_id: companyId,
        payload: JSON.stringify(payload),
        headers: JSON.stringify(headers),
        signature,
        is_valid_signature: isValidSignature,
        received_at: CameroonTimeUtils.now().format(),
        response_status: 200,
        processing_time_ms: Date.now() - startTime,
        source_ip: clientIP,
        user_agent: userAgent,
      });

      console.log(`✅ Webhook enregistré: ${webhookId} (${eventType})`);

      // Créer l'objet webhook pour la diffusion
      const webhookData = {
        id: webhookId,
        event_type: eventType,
        company_id: companyId,
        payload,
        headers,
        signature,
        is_valid_signature: isValidSignature,
        received_at: CameroonTimeUtils.now().format(),
        response_status: 200,
        processing_time_ms: Date.now() - startTime,
        source_ip: clientIP,
        user_agent: userAgent,
        mobile_provider: mobileProvider,
        received_at_human: CameroonTimeUtils.humanize(
          CameroonTimeUtils.now().toDate()
        ),
      };

      // Diffuser le nouveau webhook aux clients connectés
      broadcastToClients({
        type: "webhook_received",
        webhook: webhookData,
        stats: WebhookModel.getStats(),
      });

      // Réponse de succès
      return new Response(
        JSON.stringify({
          success: true,
          webhook_id: webhookId,
          event_type: eventType,
          company_id: companyId,
          is_valid_signature: isValidSignature,
          signature_error: signatureError,
          processing_time_ms: Date.now() - startTime,
          mobile_provider: mobileProvider,
          message: `Webhook reçu avec succès ! 🇨🇲`,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      const processingTime = Date.now() - startTime;

      console.error(`❌ Erreur traitement webhook:`, error);

      // Essayer d'enregistrer l'erreur
      try {
        const payloadText = await req.text();

        WebhookModel.create({
          event_type: "error",
          payload: payloadText || "Erreur lecture payload",
          headers: JSON.stringify(Object.fromEntries(req.headers.entries())),
          is_valid_signature: false,
          received_at: CameroonTimeUtils.now().format(),
          response_status: 500,
          processing_time_ms: processingTime,
          source_ip: req.headers.get("x-forwarded-for") || "unknown",
          user_agent: req.headers.get("user-agent") || "unknown",
        });
      } catch (dbError) {
        console.error("❌ Impossible d'enregistrer l'erreur:", dbError);
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          processing_time_ms: processingTime,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
};
