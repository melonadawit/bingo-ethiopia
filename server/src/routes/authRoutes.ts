
import { Router } from 'express';
import { login, register, telegramLogin } from '../controllers/authController';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/telegram', telegramLogin);

export default router;
