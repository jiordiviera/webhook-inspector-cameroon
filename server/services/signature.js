import crypto from 'crypto';

class SignatureValidator {
    /**
     * Valider la signature HMAC-SHA256 d'un webhook
     * Compatible avec le format Spatie/Laravel Webhook (sha256=xxx)
     */
    static validate(payload, receivedSignature, secret) {
        try {
            // Générer la signature attendue
            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(payload, 'utf8')
                .digest('hex');
            
            // Nettoyer la signature reçue (enlever le préfixe sha256=)
            let cleanReceivedSignature = receivedSignature;
            if (receivedSignature.startsWith('sha256=')) {
                cleanReceivedSignature = receivedSignature.substring(7);
            }
            
            // Comparaison timing-safe pour éviter les attaques de timing
            const isValid = crypto.timingSafeEqual(
                Buffer.from(cleanReceivedSignature, 'hex'),
                Buffer.from(expectedSignature, 'hex')
            );
            
            return {
                isValid,
                error: isValid ? null : 'Signature HMAC-SHA256 invalide',
                expected: expectedSignature,
                received: cleanReceivedSignature
            };
            
        } catch (error) {
            return {
                isValid: false,
                error: `Erreur validation signature: ${error.message}`,
                expected: null,
                received: receivedSignature
            };
        }
    }
    
    /**
     * Générer une signature HMAC-SHA256 pour tester
     */
    static generate(payload, secret) {
        try {
            const signature = crypto
                .createHmac('sha256', secret)
                .update(payload, 'utf8')
                .digest('hex');
                
            return `sha256=${signature}`;
            
        } catch (error) {
            throw new Error(`Erreur génération signature: ${error.message}`);
        }
    }
    
    /**
     * Vérifier si une signature est dans le bon format
     */
    static isValidFormat(signature) {
        if (!signature || typeof signature !== 'string') {
            return false;
        }
        
        // Format sha256=hexadecimal (64 caractères après sha256=)
        const sha256Regex = /^sha256=[a-f0-9]{64}$/i;
        
        // Format hexadecimal direct (64 caractères)
        const hexRegex = /^[a-f0-9]{64}$/i;
        
        return sha256Regex.test(signature) || hexRegex.test(signature);
    }
    
    /**
     * Comparer deux signatures de manière sécurisée
     */
    static compareSignatures(sig1, sig2) {
        try {
            // Nettoyer les signatures
            const clean1 = sig1.startsWith('sha256=') ? sig1.substring(7) : sig1;
            const clean2 = sig2.startsWith('sha256=') ? sig2.substring(7) : sig2;
            
            // Vérifier la longueur
            if (clean1.length !== clean2.length || clean1.length !== 64) {
                return false;
            }
            
            // Comparaison timing-safe
            return crypto.timingSafeEqual(
                Buffer.from(clean1, 'hex'),
                Buffer.from(clean2, 'hex')
            );
            
        } catch (error) {
            return false;
        }
    }
}

export { SignatureValidator };