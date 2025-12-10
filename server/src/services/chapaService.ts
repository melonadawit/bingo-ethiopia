import axios from 'axios';

const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY || 'CHASECK_TEST-3uteD329HSKOHaUqxxAK8qN4VU7QJgDF';
const CHAPA_PUBLIC_KEY = process.env.CHAPA_PUBLIC_KEY || 'CHAPUBK_TEST-eBkWiTm9nVjZ6t9Lfwlo4pHQwaeLZeRc';
const CHAPA_ENCRYPTION_KEY = process.env.CHAPA_ENCRYPTION_KEY || 'kGCcmvvazLOKv6Tn7Pw6nlx8';
const CHAPA_API_URL = 'https://api.chapa.co/v1';

interface ChapaPaymentRequest {
    amount: number;
    currency: string;
    email: string;
    first_name: string;
    last_name: string;
    tx_ref: string;
    callback_url: string;
    return_url: string;
    customization?: {
        title?: string;
        description?: string;
    };
}

interface ChapaPaymentResponse {
    message: string;
    status: string;
    data: {
        checkout_url: string;
    };
}

interface ChapaVerifyResponse {
    message: string;
    status: string;
    data: {
        amount: number;
        currency: string;
        email: string;
        first_name: string;
        last_name: string;
        tx_ref: string;
        status: string;
    };
}

class ChapaService {
    private headers = {
        'Authorization': `Bearer ${CHAPA_SECRET_KEY}`,
        'Content-Type': 'application/json',
    };

    /**
     * Initialize a payment
     */
    async initializePayment(data: ChapaPaymentRequest): Promise<ChapaPaymentResponse> {
        try {
            const response = await axios.post(
                `${CHAPA_API_URL}/transaction/initialize`,
                data,
                { headers: this.headers }
            );
            return response.data;
        } catch (error: any) {
            console.error('Chapa payment initialization error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Payment initialization failed');
        }
    }

    /**
     * Verify a payment
     */
    async verifyPayment(txRef: string): Promise<ChapaVerifyResponse> {
        try {
            const response = await axios.get(
                `${CHAPA_API_URL}/transaction/verify/${txRef}`,
                { headers: this.headers }
            );
            return response.data;
        } catch (error: any) {
            console.error('Chapa payment verification error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Payment verification failed');
        }
    }

    /**
     * Generate a unique transaction reference
     */
    generateTxRef(): string {
        return `bingo-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    }
}

export default new ChapaService();
